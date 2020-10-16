/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// core-js and regenerator-runtime are requried to ensure the correct polyfills
// are applied by babel/webpack.
import "core-js/stable";
import "regenerator-runtime/runtime";

import RouteRecognizer from "route-recognizer";
import YAML from "yaml";

// plugin contains interfaces your plugin can expect
// this includes your main plugin class, response, requests, and clients.
import * as octant from "@project-octant/plugin";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

// components
import { ButtonGroupFactory } from "@project-octant/plugin/components/button-group";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { TextFactory } from "@project-octant/plugin/components/text";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { ListFactory } from "@project-octant/plugin/components/list";

import { Configuration, ConfigurationListFactory, ConfigurationSummaryFactory } from "./serving/configuration";
import { Revision, RevisionSummaryFactory } from "./serving/revision";
import { Route, RouteDataPlaneViewerFactory, RouteListFactory, RouteSummaryFactory } from "./serving/route";
import { Service, ServiceListFactory, ServiceSummaryFactory, NewServiceFactory, ServiceResourceViewerFactory } from "./serving/service";

import { MetadataSummaryFactory } from "./metadata";
import { knativeLinker, ServingV1, ServingV1Service, ServingV1Configuration, ServingV1Revision, ServingV1Route } from "./utils";
import { V1Pod, V1ObjectReference, V1Deployment } from "@kubernetes/client-node";
import { notFoundContentResponse } from "./not-found";
import { DashboardClient, EditorFactory } from "./utils";

export default class MyPlugin implements octant.Plugin {
  // Static fields that Octant uses
  name = "knative";
  description = "Knative plugin for Octant";

  // If true, the contentHandler and navigationHandler will be called.
  isModule = true;

  create = false;

  // Octant will assign these via the constructor at runtime.
  dashboardClient: DashboardClient;
  httpClient: octant.HTTPClient;
  router: RouteRecognizer;
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;

  // Plugin capabilities
  capabilities = {
    supportPrinterConfig: [],
    supportTab: [],
    actionNames: [
      "knative.dev/configure",
      "knative.dev/newService",
      "knative.dev/setContentPath",
      "action.octant.dev/setNamespace",
    ],
  };

  // Custom plugin properties
  namespace: string;

  // Octant expects plugin constructors to accept two arguments, the dashboardClient and the httpClient
  constructor(
    dashboardClient: DashboardClient,
    httpClient: octant.HTTPClient
  ) {
    this.dashboardClient = dashboardClient;
    this.httpClient = httpClient;

    this.namespace = "default";

    this.router = new RouteRecognizer();
    this.linker = (ref: V1ObjectReference, context?: V1ObjectReference) => knativeLinker(this.dashboardClient.RefPath, ref, context);

    this.router.add([{
      path: "/_create",
      handler: (params: any) => {
        this.create = true;
        this.dashboardClient.SendEvent(params.clientID, "event.octant.dev/contentPath", { contentPath: "/knative" });
        return h.createContentResponse([], []);
      }
    }]);
    this.router.add([{
      path: "/serving",
      handler: this.servingOverviewHandler,
    }]);
    this.router.add([{
      path: "/serving/services",
      handler: this.serviceListingHandler,
    }]);
    this.router.add([{
      path: "/serving/services/_new",
      handler: this.newServiceHandler,
    }]);
    this.router.add([{
      path: "/serving/services/:serviceName",
      handler: this.serviceDetailHandler,
    }]);
    this.router.add([{
      path: "/serving/services/:serviceName/revisions",
      handler: this.revisionListHandler,
    }]);
    this.router.add([{
      path: "/serving/services/:serviceName/revisions/:revisionName",
      handler: this.revisionDetailHandler,
    }]);
    this.router.add([{
      path: "/serving/configurations",
      handler: this.configurationListingHandler,
    }]);
    this.router.add([{
      path: "/serving/configurations/:configurationName",
      handler: this.configurationDetailHandler,
    }]);
    this.router.add([{
      path: "/serving/configurations/:configurationName/revisions",
      handler: this.revisionListHandler,
    }]);
    this.router.add([{
      path: "/serving/configurations/:configurationName/revisions/:revisionName",
      handler: this.revisionDetailHandler,
    }]);
    this.router.add([{
      path: "/serving/routes",
      handler: this.routeListingHandler,
    }]);
    this.router.add([{
      path: "/serving/routes/:routeName",
      handler: this.routeDetailHandler,
    }]);
  }

  printHandler(request: octant.ObjectRequest): octant.PrintResponse {
    throw new Error('KnativePlugin#printHandler should never be called');
  }

  actionHandler(request: octant.ActionRequest): octant.ActionResponse | void {
    if (request.actionName === "action.octant.dev/setNamespace") {
      this.namespace = request.payload.namespace;
      return;
    }

    if (request.actionName === "knative.dev/configure") {
      const resource = YAML.parse(request.payload.resource);

      // TODO this should not be necessary
      delete resource.metadata.managedFields;

      // apply edits
      if (request.payload.revisionName) {
        resource.spec.template.metadata.name = `${resource.metadata.name}-${request.payload.revisionName}`;
      } else {
        delete resource.spec.template.metadata.name;
      }
      resource.spec.template.spec.containers[0].image = request.payload.image;
      
      this.dashboardClient.Update(resource.metadata.namespace, JSON.stringify(resource));
      return;
    }

    if (request.actionName === "knative.dev/newService") {
      const resource = {
        apiVersion: ServingV1,
        kind: ServingV1Service,
        metadata: {
          namespace: this.namespace,
          name: request.payload.name,
        },
        spec: {
          template: {
            metadata: {
              ...(request.payload.revisionName && { name: request.payload.revisionName }),
            },
            spec: {
              containers: [
                {
                  image: request.payload.image,
                },
              ],
            },
          },
        },
      };

      // TODO handle errors
      this.dashboardClient.Update(this.namespace, JSON.stringify(resource));
      const newContentPath = this.linker({ apiVersion: ServingV1, kind: ServingV1Service, name: request.payload.name });
      this.dashboardClient.SendEvent(request.payload.clientID, "event.octant.dev/contentPath", { contentPath: newContentPath });

      return;
    }

    if (request.actionName === "knative.dev/setContentPath") {
      this.dashboardClient.SendEvent(request.payload.clientID, "event.octant.dev/contentPath", { contentPath: request.payload.contentPath });

      return;
    }

    return;
  }

  tabHandler(request: octant.ObjectRequest): octant.TabResponse {
    throw new Error('KnativePlugin#tabHandler should never be called');
  }

  navigationHandler(): octant.Navigation {
    let nav = new h.Navigation("Knative", "knative", "cloud");
    nav.add("Services", "serving/services");
    nav.add("Configurations", "serving/configurations");
    nav.add("Routes", "serving/routes");
    return nav;
  }

  contentHandler(request: octant.ContentRequest): octant.ContentResponse {
    const { contentPath } = request;

    if (contentPath === "") {
      // the router isn't able to match this path for some reason, so hard code it
      // return this.knativeOverviewHandler(request);

      // TODO redirect to the serving overview until we support more than just serving
      this.dashboardClient.SendEvent(request.clientID, "event.octant.dev/contentPath", { contentPath: "/knative/serving" });
      return h.createContentResponse([], []);
    }

    const results: any = this.router.recognize(contentPath);
    if (!results) {
      // not found
      return notFoundContentResponse({ contentPath });
    }

    const result = results[0];
    const { handler, params } = result;
    try {
      return handler.call(this, Object.assign({}, params, request));
    } catch (e) {
      // TODO handle errors other than not found
      console.error(`Error rendering Knative plugin content path "${contentPath}": ${JSON.stringify(e)}`);
      return notFoundContentResponse({ contentPath });
    }
  }

  knativeOverviewHandler(params: any): octant.ContentResponse {
    const title = [
      new TextFactory({ value: "Knative" })
    ];
    const serving = new ListFactory({
      factoryMetadata: {
        title: [new TextFactory({ value: "Serving" }).toComponent()],
      },
      items: [
        new ListFactory({
          items: [
            this.serviceListing(params.clientID, {
              title: [new TextFactory({ value: "Services" }).toComponent()],
            }).toComponent(),
            this.configurationListing({
              title: [new TextFactory({ value: "Configurations" }).toComponent()],
            }).toComponent(),
            this.routeListing({
              title: [new TextFactory({ value: "Routes" }).toComponent()],
            }).toComponent(),
          ],
        }).toComponent(),
      ],
    });
    // const eventing = new ListFactory({
    //   factoryMetadata: {
    //     title: [new TextFactory({ value: "Eventing" }).toComponent()],
    //   },
    //   items: [
    //     new ListFactory({
    //       items: [
    //         new TextFactory({ value: "todo" }).toComponent(),
    //       ],
    //     }).toComponent(),
    //   ],
    // });
    // return h.createContentResponse(title, [serving, eventing]);
    return h.createContentResponse(title, [serving]);
  }

  servingOverviewHandler(params: any): octant.ContentResponse {
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new TextFactory({ value: "Serving" })
    ];
    const body = new ListFactory({
      factoryMetadata: {
        title: title.map(f => f.toComponent()),
      },
      items: [
        this.serviceListing(params.clientID, {
          title: [new TextFactory({ value: "Services" }).toComponent()],
        }).toComponent(),
        this.configurationListing({
          title: [new TextFactory({ value: "Configurations" }).toComponent()],
        }).toComponent(),
        this.routeListing({
          title: [new TextFactory({ value: "Routes" }).toComponent()],
        }).toComponent(),
      ],
    });
    return h.createContentResponse(title, [body]);
  }

  serviceListingHandler(params: any): octant.ContentResponse {
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Serving", ref: this.linker({ apiVersion: ServingV1 }) }),
      new TextFactory({ value: "Services" }),
    ];
    const body = new ListFactory({
      items: [
        this.serviceListing(params.clientID, {
          title: [new TextFactory({ value: "Services" }).toComponent()],
        }).toComponent(),
      ],
      factoryMetadata: {
        title: title.map(f => f.toComponent()),
      },
    })
    return h.createContentResponse(title, [body]);
  }

  newServiceHandler(params: any): octant.ContentResponse {
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Serving", ref: this.linker({ apiVersion: ServingV1 }) }),
      new LinkFactory({ value: "Services", ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Service }) }),
      new TextFactory({ value: "New Service" }),
    ];
    const body = this.newService(params.clientID, { title: title.map(c => c.toComponent()) });
    return h.createContentResponse(title, body);
  }

  serviceDetailHandler(params: any): octant.ContentResponse {
    const name: string = params.serviceName;
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Serving", ref: this.linker({ apiVersion: ServingV1 }) }),
      new LinkFactory({ value: "Services", ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Service }) }),
      new TextFactory({ value: name }),
    ];
    const body = this.serviceDetail(name);
    const buttonGroup = new ButtonGroupFactory({
      buttons: [
        {
          name: "Delete",
          payload: {
            action: "action.octant.dev/deleteObject",
            apiVersion: ServingV1,
            kind:       ServingV1Service,
            namespace:  this.namespace,
            name:       name,
          },
          confirmation: {
            title: "Delete Service",
            body: `Are you sure you want to delete *Service* **${name}**? This action is permanent and cannot be recovered.`,
          },
        },
      ],
    });
    return h.createContentResponse(title, body, buttonGroup);
  }

  configurationListingHandler(params: any): octant.ContentResponse {
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Serving", ref: this.linker({ apiVersion: ServingV1 }) }),
      new TextFactory({ value: "Configurations" }),
    ];
    const body = new ListFactory({
      items: [
        this.configurationListing({
          title: [new TextFactory({ value: "Configurations" }).toComponent()],
        }).toComponent(),
      ],
      factoryMetadata: {
        title: title.map(f => f.toComponent()),
      },
    });
    return h.createContentResponse(title, [body]);
  }

  configurationDetailHandler(params: any): octant.ContentResponse {
    const name: string = params.configurationName;
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Serving", ref: this.linker({ apiVersion: ServingV1 }) }),
      new LinkFactory({ value: "Configurations", ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Configuration }) }),
      new TextFactory({ value: name }),
    ];
    const body = this.configurationDetail(name);
    const buttonGroup = new ButtonGroupFactory({
      buttons: [
        {
          name: "Delete",
          payload: {
            action: "action.octant.dev/deleteObject",
            apiVersion: ServingV1,
            kind:       ServingV1Configuration,
            namespace:  this.namespace,
            name:       name,
          },
          confirmation: {
            title: "Delete Configuration",
            body: `Are you sure you want to delete *Configuration* **${name}**? This action is permanent and cannot be recovered.`,
          },
        },
      ],
    });
    return h.createContentResponse(title, body, buttonGroup);
  }

  revisionListHandler(params: any): octant.ContentResponse {
    if (params.serviceName) {
      const contentPath = this.linker({ apiVersion: ServingV1, kind: ServingV1Service, name: params.serviceName })
      this.dashboardClient.SendEvent(params.clientID, "event.octant.dev/contentPath", { contentPath });
    } else if (params.configurationName) {
      const contentPath = this.linker({ apiVersion: ServingV1, kind: ServingV1Configuration, name: params.configurationName })
      this.dashboardClient.SendEvent(params.clientID, "event.octant.dev/contentPath", { contentPath });
    } else {
      const contentPath = this.linker({ apiVersion: ServingV1 });
      this.dashboardClient.SendEvent(params.clientID, "event.octant.dev/contentPath", { contentPath });
    }

    return h.createContentResponse([], []);
  }

  revisionDetailHandler(params: any): octant.ContentResponse {
    const name: string = params.revisionName;
    const title = [];
    if (params.serviceName) {
      title.push(
        new LinkFactory({ value: "Knative", ref: "/knative" }),
        new LinkFactory({ value: "Serving", ref: this.linker({ apiVersion: ServingV1 }) }),
        new LinkFactory({ value: "Services", ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Service }) }),
        new LinkFactory({ value: params.serviceName, ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Service, name: params.serviceName }) }),
        new LinkFactory({ value: "Revisions", ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision }, { apiVersion: ServingV1, kind: ServingV1Service, name: params.serviceName }) }),
        new TextFactory({ value: name }),
      );
    } else if (params.configurationName) {
      title.push(
        new LinkFactory({ value: "Knative", ref: "/knative" }),
        new LinkFactory({ value: "Serving", ref: this.linker({ apiVersion: ServingV1 }) }),
        new LinkFactory({ value: "Configurations", ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Configuration }) }),
        new LinkFactory({ value: params.configurationName, ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Configuration, name: params.configurationName }) }),
        new LinkFactory({ value: "Revisions", ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision }, { apiVersion: ServingV1, kind: ServingV1Configuration, name: params.configurationName }) }),
        new TextFactory({ value: name }),
      );
    }

    const body = this.revisionDetail(name);
    const buttonGroup = new ButtonGroupFactory({
      buttons: [
        {
          name: "Delete",
          payload: {
            action: "action.octant.dev/deleteObject",
            apiVersion: ServingV1,
            kind:       ServingV1Revision,
            namespace:  this.namespace,
            name:       name,
          },
          confirmation: {
            title: "Delete Revision",
            body: `Are you sure you want to delete *Revision* **${name}**? This action is permanent and cannot be recovered.`,
          },
        },
      ],
    });
    return h.createContentResponse(title, body, buttonGroup);
  }

  routeListingHandler(params: any): octant.ContentResponse {
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Serving", ref: this.linker({ apiVersion: ServingV1 }) }),
      new TextFactory({ value: "Routes" }),
    ];
    const body = new ListFactory({
      items: [
        this.routeListing({
          title: [new TextFactory({ value: "Routes" }).toComponent()],
        }).toComponent(),
      ],
      factoryMetadata: {
        title: title.map(f => f.toComponent()),
      },
    });
    return h.createContentResponse(title, [body]);
  }

  routeDetailHandler(params: any): octant.ContentResponse {
    const name: string = params.routeName;
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Serving", ref: this.linker({ apiVersion: ServingV1 }) }),
      new LinkFactory({ value: "Routes", ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Route }) }),
      new TextFactory({ value: name }),
    ];
    const body = this.routeDetail(name);
    const buttonGroup = new ButtonGroupFactory({
      buttons: [
        {
          name: "Delete",
          payload: {
            action: "action.octant.dev/deleteObject",
            apiVersion: ServingV1,
            kind:       ServingV1Route,
            namespace:  this.namespace,
            name:       name,
          },
          confirmation: {
            title: "Delete Route",
            body: `Are you sure you want to delete *Route* **${name}**? This action is permanent and cannot be recovered.`,
          },
        },
      ],
    });
    return h.createContentResponse(title, body, buttonGroup);
  }

  serviceListing(clientID: string, factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
    const services: Service[] = this.dashboardClient.List({
      apiVersion: ServingV1,
      kind: ServingV1Service,
      namespace: this.namespace,
    });
    services.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));

    const buttonGroup = this.create ? new ButtonGroupFactory({
      buttons: [
        {
          name: "New Service",
          payload: {
            action: "knative.dev/setContentPath",
            clientID: clientID,
            contentPath: this.linker({ apiVersion: ServingV1, kind: ServingV1Service, name: "_new" }),
          },
        },
      ],
      factoryMetadata,
    }) : void 0;

    return new ServiceListFactory({ services, buttonGroup, linker: this.linker, factoryMetadata });
  }

  newService(clientID: string, factoryMetadata?: FactoryMetadata ): ComponentFactory<any>[] {
    const form = new NewServiceFactory({ clientID, factoryMetadata });
    
    return [form];
  }

  serviceDetail(name: string): ComponentFactory<any>[] {
    const service: Service = this.dashboardClient.Get({
      apiVersion: ServingV1,
      kind: ServingV1Service,
      namespace: this.namespace,
      name: name,
    });
    const routes: Route[] = this.dashboardClient.List({
      apiVersion: ServingV1,
      kind: ServingV1Route,
      namespace: service.metadata.namespace,
      selector: { "serving.knative.dev/service": service.metadata.name },
    });
    // TODO verify the route is controlled by this service
    const route = routes[0];
    const revisions: Revision[] = this.dashboardClient.List({
      apiVersion: ServingV1,
      kind: ServingV1Revision,
      namespace: this.namespace,
      selector: {
        'serving.knative.dev/service': service.metadata.name,
      },
    });
    revisions.sort((a, b) => {
      const generationA = (a.metadata.labels || {})['serving.knative.dev/configurationGeneration'] || '-1';
      const generationB = (b.metadata.labels || {})['serving.knative.dev/configurationGeneration'] || '-1';
      return parseInt(generationB) - parseInt(generationA)
    });
    const childDeployments = revisions.reduce((childDeployments, revision) => {
      const deployments = this.dashboardClient.List({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        namespace: revision.metadata.namespace || '',
        labelSelector: {
          matchLabels: {
            'serving.knative.dev/revision': revision.metadata.name || '_',
          },
        },
      });
      if (deployments.length) {
        childDeployments[revision.metadata.uid || ''] = deployments[0];
      }
      return childDeployments;
    }, {} as {[key: string]: V1Deployment});
    const allRoutes = this.dashboardClient.List({
      apiVersion: ServingV1,
      kind: ServingV1Route,
      namespace: service.metadata.namespace || '',
    });
    allRoutes.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));

    return [
      new ServiceSummaryFactory({
        service,
        revisions,
        childDeployments,
        allRoutes,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Summary" }).toComponent()],
          accessor: "summary",
        },
        create: this.create,
      }),
      new MetadataSummaryFactory({
        object: service,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Metadata" }).toComponent()],
          accessor: "metadata",
        },
      }),
      new RouteDataPlaneViewerFactory({
        route,
        dashboardClient: this.dashboardClient,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Data Plane" }).toComponent()],
          accessor: "dataPlane",
        },
      }),
      new ServiceResourceViewerFactory({
        service,
        dashboardClient: this.dashboardClient,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Resource Viewer" }).toComponent()],
          accessor: "resourceViewer",
        },
      }),
      new EditorFactory({
        value: "---\n" + YAML.stringify(JSON.parse(JSON.stringify(service)), { sortMapEntries: true }),
        language: 'yaml',
        readOnly: false,
        metadata: {
          apiVersion: service.apiVersion,
          kind: service.kind,
          namespace: service.metadata.namespace || '',
          name: service.metadata.name || '',
        },
        factoryMetadata: {
          title: [new TextFactory({ value: "YAML" }).toComponent()],
          accessor: "yaml",
        },
      })
    ];
  }

  configurationListing(factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
    const configurations: Configuration[] = this.dashboardClient.List({
      apiVersion: ServingV1,
      kind: ServingV1Configuration,
      namespace: this.namespace,
    });
    configurations.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));

    return new ConfigurationListFactory({ configurations, linker: this.linker, factoryMetadata });
  }

  configurationDetail(name: string): ComponentFactory<any>[] {
    const configuration: Configuration = this.dashboardClient.Get({
      apiVersion: ServingV1,
      kind: ServingV1Configuration,
      namespace: this.namespace,
      name: name,
    });
    const revisions: Revision[] = this.dashboardClient.List({
      apiVersion: ServingV1,
      kind: ServingV1Revision,
      namespace: this.namespace,
      selector: {
        'serving.knative.dev/configuration': configuration.metadata.name,
      },
    });
    revisions.sort((a, b) => {
      const generationA = (a.metadata.labels || {})['serving.knative.dev/configurationGeneration'] || '-1';
      const generationB = (b.metadata.labels || {})['serving.knative.dev/configurationGeneration'] || '-1';
      return parseInt(generationB) - parseInt(generationA)
    });
    const childDeployments = revisions.reduce((childDeployments, revision) => {
      const deployments = this.dashboardClient.List({
        apiVersion: 'apps/v1',
        kind: 'Deployment',
        namespace: revision.metadata.namespace || '',
        labelSelector: {
          matchLabels: {
            'serving.knative.dev/revision': revision.metadata.name || '_',
          },
        },
      });
      childDeployments[revision.metadata.uid || ''] = deployments[0];
      return childDeployments;
    }, {} as {[key: string]: V1Deployment});
    const allRoutes: Route[] = this.dashboardClient.List({
      apiVersion: ServingV1,
      kind: ServingV1Route,
      namespace: configuration.metadata.namespace || '',
    });
    allRoutes.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));

    return [
      new ConfigurationSummaryFactory({
        configuration,
        revisions,
        childDeployments,
        allRoutes,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Summary" }).toComponent()],
          accessor: "summary",
        },
        create: this.create,
      }),
      new MetadataSummaryFactory({
        object: configuration,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Metadata" }).toComponent()],
          accessor: "metadata",
        },
      }),
      new EditorFactory({
        value: "---\n" + YAML.stringify(JSON.parse(JSON.stringify(configuration)), { sortMapEntries: true }),
        language: 'yaml',
        readOnly: false,
        metadata: {
          apiVersion: configuration.apiVersion,
          kind: configuration.kind,
          namespace: configuration.metadata.namespace || '',
          name: configuration.metadata.name || '',
        },
        factoryMetadata: {
          title: [new TextFactory({ value: "YAML" }).toComponent()],
          accessor: "yaml",
        },
      })
    ];
  }

  revisionDetail(name: string): ComponentFactory<any>[] {
    const revision: Revision = this.dashboardClient.Get({
      apiVersion: ServingV1,
      kind: ServingV1Revision,
      namespace: this.namespace,
      name: name,
    });
    const childDeployment: V1Deployment | undefined = this.dashboardClient.List({
      apiVersion: 'apps/v1',
      kind: 'Deployment',
      namespace: revision.metadata.namespace || '',
      labelSelector: {
        matchLabels: {
          'serving.knative.dev/revision': revision.metadata.name || '_',
        },
      },
    })[0];
    const pods: V1Pod[] = this.dashboardClient.List({
      apiVersion: 'v1',
      kind: 'Pod',
      namespace: this.namespace,
      selector: {
        'serving.knative.dev/revision': name,
      },
    });
    pods.sort((a, b) => (a.metadata?.name || '').localeCompare(b.metadata?.name || ''));

    return [
      new RevisionSummaryFactory({
        revision,
        childDeployment,
        pods,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Summary" }).toComponent()],
          accessor: "summary",
        },
      }),
      new MetadataSummaryFactory({
        object: revision,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Metadata" }).toComponent()],
          accessor: "metadata",
        },
      }),
      new EditorFactory({
        value: "---\n" + YAML.stringify(JSON.parse(JSON.stringify(revision)), { sortMapEntries: true }),
        language: 'yaml',
        readOnly: false,
        metadata: {
          apiVersion: revision.apiVersion,
          kind: revision.kind,
          namespace: revision.metadata.namespace || '',
          name: revision.metadata.name || '',
        },
        factoryMetadata: {
          title: [new TextFactory({ value: "YAML" }).toComponent()],
          accessor: "yaml",
        },
      })
    ];
  }

  routeListing(factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
    const routes: Route[] = this.dashboardClient.List({
      apiVersion: ServingV1,
      kind: ServingV1Route,
      namespace: this.namespace,
    });
    routes.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));

    return new RouteListFactory({ routes, linker: this.linker, factoryMetadata });
  }

  routeDetail(name: string): ComponentFactory<any>[] {
    const route: Route = this.dashboardClient.Get({
      apiVersion: ServingV1,
      kind: ServingV1Route,
      namespace: this.namespace,
      name: name,
    });

    return [
      new RouteSummaryFactory({
        route,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Summary" }).toComponent()],
          accessor: "summary",
        },
      }),
      new MetadataSummaryFactory({
        object: route,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Metadata" }).toComponent()],
          accessor: "metadata",
        },
      }),
      new RouteDataPlaneViewerFactory({
        route,
        dashboardClient: this.dashboardClient,
        linker: this.linker,
        factoryMetadata: {
          title: [new TextFactory({ value: "Data Plane" }).toComponent()],
          accessor: "dataPlane",
        },
      }),
      new EditorFactory({
        value: "---\n" + YAML.stringify(JSON.parse(JSON.stringify(route)), { sortMapEntries: true }),
        language: 'yaml',
        readOnly: false,
        metadata: {
          apiVersion: route.apiVersion,
          kind: route.kind,
          namespace: route.metadata.namespace || '',
          name: route.metadata.name || '',
        },
        factoryMetadata: {
          title: [new TextFactory({ value: "YAML" }).toComponent()],
          accessor: "yaml",
        },
      })
    ];
  }

}

console.log("loading knative.ts");
