/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import YAML from "yaml";

// plugin contains interfaces your plugin can expect
// this includes your main plugin class, response, requests, and clients.
import * as octant from "@project-octant/plugin";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

// components
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { ButtonGroupFactory } from "@project-octant/plugin/components/button-group";
import { EditorFactory } from "@project-octant/plugin/components/editor";
import { MetadataSummaryFactory } from "./components/metadata";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { ListFactory } from "@project-octant/plugin/components/list";
import { TextFactory } from "@project-octant/plugin/components/text";

import { V1Pod, V1Deployment } from "@kubernetes/client-node";
import { ServingV1, ServingV1Service, ServingV1Configuration, ServingV1Revision, ServingV1Route, Configuration, Revision, Route, Service } from "./serving/api";

import { ConfigurationListFactory, ConfigurationSummaryFactory } from "./serving/configuration";
import { RevisionSummaryFactory } from "./serving/revision";
import { RouteDataPlaneViewerFactory, RouteListFactory, RouteSummaryFactory } from "./serving/route";
import { ServiceListFactory, ServiceSummaryFactory, NewServiceFactory, ServiceResourceViewerFactory } from "./serving/service";

import ctx from "./context";

export function configureActionHandler(request: octant.ActionRequest): octant.ActionResponse | void {
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
  
  ctx.dashboardClient.Update(resource.metadata.namespace, JSON.stringify(resource));
}

export function newServiceActionHandler(request: octant.ActionRequest): octant.ActionResponse | void {
  const resource = {
    apiVersion: ServingV1,
    kind: ServingV1Service,
    metadata: {
      namespace: ctx.namespace,
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
  ctx.dashboardClient.Update(ctx.namespace, JSON.stringify(resource));
  const newContentPath = ctx.linker({ apiVersion: ServingV1, kind: ServingV1Service, name: request.payload.name });
  ctx.dashboardClient.SendEvent(request.payload.clientID, "event.octant.dev/contentPath", { contentPath: newContentPath });
}

export function servingOverviewContentHandler(params: any): octant.ContentResponse {
  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new TextFactory({ value: "Serving" })
  ];
  const body = new ListFactory({
    factoryMetadata: {
      title: title.map(f => f.toComponent()),
    },
    items: [
      serviceListing(params.clientID, {
        title: [new TextFactory({ value: "Services" }).toComponent()],
      }).toComponent(),
      configurationListing({
        title: [new TextFactory({ value: "Configurations" }).toComponent()],
      }).toComponent(),
      routeListing({
        title: [new TextFactory({ value: "Routes" }).toComponent()],
      }).toComponent(),
    ],
  });
  return h.createContentResponse(title, [body]);
}

export function serviceListingContentHandler(params: any): octant.ContentResponse {
  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Serving", ref: ctx.linker({ apiVersion: ServingV1 }) }),
    new TextFactory({ value: "Services" }),
  ];
  const body = new ListFactory({
    items: [
      serviceListing(params.clientID, {
        title: [new TextFactory({ value: "Services" }).toComponent()],
      }).toComponent(),
    ],
    factoryMetadata: {
      title: title.map(f => f.toComponent()),
    },
  })
  return h.createContentResponse(title, [body]);
}

export function serviceDetailContentHandler(params: any): octant.ContentResponse {
  const name: string = params.serviceName;
  const service: Service = ctx.dashboardClient.Get({
    apiVersion: ServingV1,
    kind: ServingV1Service,
    namespace: ctx.namespace,
    name: name,
  });
  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Serving", ref: ctx.linker({ apiVersion: ServingV1 }) }),
    new LinkFactory({ value: "Services", ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Service }) }),
    new TextFactory({ value: name }),
  ];
  const body = serviceDetail(service);
  const controlledBy = service.metadata.ownerReferences?.find(r => r.controller);
  const controlledByMessage = controlledBy ? `This resource is controlled by *${controlledBy.kind}* **${controlledBy.name}**, deleting it may not have the intended effect.\n\n` : '';
  const buttonGroup = new ButtonGroupFactory({
    buttons: [
      {
        name: "Delete",
        payload: {
          action: "action.octant.dev/deleteObject",
          apiVersion: ServingV1,
          kind:       ServingV1Service,
          namespace:  ctx.namespace,
          name:       name,
        },
        confirmation: {
          title: "Delete Service",
          body: `${controlledByMessage}Are you sure you want to delete *Service* **${name}**? This action is permanent and cannot be recovered.`,
        },
      },
    ],
  });
  return h.createContentResponse(title, body, buttonGroup);
}

export function configurationListingContentHandler(params: any): octant.ContentResponse {
  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Serving", ref: ctx.linker({ apiVersion: ServingV1 }) }),
    new TextFactory({ value: "Configurations" }),
  ];
  const body = new ListFactory({
    items: [
      configurationListing({
        title: [new TextFactory({ value: "Configurations" }).toComponent()],
      }).toComponent(),
    ],
    factoryMetadata: {
      title: title.map(f => f.toComponent()),
    },
  });
  return h.createContentResponse(title, [body]);
}

export function configurationDetailContentHandler(params: any): octant.ContentResponse {
  const name: string = params.configurationName;
  const configuration: Configuration = ctx.dashboardClient.Get({
    apiVersion: ServingV1,
    kind: ServingV1Configuration,
    namespace: ctx.namespace,
    name: name,
  });
  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Serving", ref: ctx.linker({ apiVersion: ServingV1 }) }),
    new LinkFactory({ value: "Configurations", ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Configuration }) }),
    new TextFactory({ value: name }),
  ];
  const body = configurationDetail(configuration);
  const controlledBy = configuration.metadata.ownerReferences?.find(r => r.controller);
  const controlledByMessage = controlledBy ? `This resource is controlled by *${controlledBy.kind}* **${controlledBy.name}**, deleting it may not have the intended effect.\n\n` : '';
  const buttonGroup = new ButtonGroupFactory({
    buttons: [
      {
        name: "Delete",
        payload: {
          action: "action.octant.dev/deleteObject",
          apiVersion: ServingV1,
          kind:       ServingV1Configuration,
          namespace:  ctx.namespace,
          name:       name,
        },
        confirmation: {
          title: "Delete Configuration",
          body: `${controlledByMessage}Are you sure you want to delete *Configuration* **${name}**? This action is permanent and cannot be recovered.`,
        },
      },
    ],
  });
  return h.createContentResponse(title, body, buttonGroup);
}

export function revisionListContentHandler(params: any): octant.ContentResponse {
  if (params.serviceName) {
    const contentPath = ctx.linker({ apiVersion: ServingV1, kind: ServingV1Service, name: params.serviceName })
    ctx.dashboardClient.SendEvent(params.clientID, "event.octant.dev/contentPath", { contentPath });
  } else if (params.configurationName) {
    const contentPath = ctx.linker({ apiVersion: ServingV1, kind: ServingV1Configuration, name: params.configurationName })
    ctx.dashboardClient.SendEvent(params.clientID, "event.octant.dev/contentPath", { contentPath });
  } else {
    const contentPath = ctx.linker({ apiVersion: ServingV1 });
    ctx.dashboardClient.SendEvent(params.clientID, "event.octant.dev/contentPath", { contentPath });
  }

  return h.createContentResponse([], []);
}

export function revisionDetailContentHandler(params: any): octant.ContentResponse {
  const name: string = params.revisionName;
  const revision: Revision = ctx.dashboardClient.Get({
    apiVersion: ServingV1,
    kind: ServingV1Revision,
    namespace: ctx.namespace,
    name: name,
  });
  const title = [];
  if (params.serviceName) {
    title.push(
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Serving", ref: ctx.linker({ apiVersion: ServingV1 }) }),
      new LinkFactory({ value: "Services", ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Service }) }),
      new LinkFactory({ value: params.serviceName, ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Service, name: params.serviceName }) }),
      new LinkFactory({ value: "Revisions", ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Revision }, { apiVersion: ServingV1, kind: ServingV1Service, name: params.serviceName }) }),
      new TextFactory({ value: name }),
    );
  } else if (params.configurationName) {
    title.push(
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Serving", ref: ctx.linker({ apiVersion: ServingV1 }) }),
      new LinkFactory({ value: "Configurations", ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Configuration }) }),
      new LinkFactory({ value: params.configurationName, ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Configuration, name: params.configurationName }) }),
      new LinkFactory({ value: "Revisions", ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Revision }, { apiVersion: ServingV1, kind: ServingV1Configuration, name: params.configurationName }) }),
      new TextFactory({ value: name }),
    );
  }

  const body = revisionDetail(revision);
  const controlledBy = revision.metadata.ownerReferences?.find(r => r.controller);
  const controlledByMessage = controlledBy ? `This resource is controlled by *${controlledBy.kind}* **${controlledBy.name}**, deleting it may not have the intended effect.\n\n` : '';
  const buttonGroup = new ButtonGroupFactory({
    buttons: [
      {
        name: "Delete",
        payload: {
          action: "action.octant.dev/deleteObject",
          apiVersion: ServingV1,
          kind:       ServingV1Revision,
          namespace:  ctx.namespace,
          name:       name,
        },
        confirmation: {
          title: "Delete Revision",
          body: `${controlledByMessage}Are you sure you want to delete *Revision* **${name}**? This action is permanent and cannot be recovered.`,
        },
      },
    ],
  });
  return h.createContentResponse(title, body, buttonGroup);
}

export function routeListingContentHandler(params: any): octant.ContentResponse {
  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Serving", ref: ctx.linker({ apiVersion: ServingV1 }) }),
    new TextFactory({ value: "Routes" }),
  ];
  const body = new ListFactory({
    items: [
      routeListing({
        title: [new TextFactory({ value: "Routes" }).toComponent()],
      }).toComponent(),
    ],
    factoryMetadata: {
      title: title.map(f => f.toComponent()),
    },
  });
  return h.createContentResponse(title, [body]);
}

export function routeDetailContentHandler(params: any): octant.ContentResponse {
  const name: string = params.routeName;
  const route: Route = ctx.dashboardClient.Get({
    apiVersion: ServingV1,
    kind: ServingV1Route,
    namespace: ctx.namespace,
    name: name,
  });
  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Serving", ref: ctx.linker({ apiVersion: ServingV1 }) }),
    new LinkFactory({ value: "Routes", ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Route }) }),
    new TextFactory({ value: name }),
  ];
  const body = routeDetail(route);
  const controlledBy = route.metadata.ownerReferences?.find(r => r.controller);
  const controlledByMessage = controlledBy ? `This resource is controlled by *${controlledBy.kind}* **${controlledBy.name}**, deleting it may not have the intended effect.\n\n` : '';
  const buttonGroup = new ButtonGroupFactory({
    buttons: [
      {
        name: "Delete",
        payload: {
          action: "action.octant.dev/deleteObject",
          apiVersion: ServingV1,
          kind:       ServingV1Route,
          namespace:  ctx.namespace,
          name:       name,
        },
        confirmation: {
          title: "Delete Route",
          body: `${controlledByMessage}Are you sure you want to delete *Route* **${name}**? This action is permanent and cannot be recovered.`,
        },
      },
    ],
  });
  return h.createContentResponse(title, body, buttonGroup);
}

export function serviceListing(clientID: string, factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
  const services: Service[] = ctx.dashboardClient.List({
    apiVersion: ServingV1,
    kind: ServingV1Service,
    namespace: ctx.namespace,
  });
  services.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));

  const buttonGroup = ctx.create ? new ButtonGroupFactory({
    buttons: [
      {
        name: "New Service",
        payload: {},
        modal: new NewServiceFactory({ clientID }).toComponent(),
      },
    ],
    factoryMetadata,
  }) : void 0;

  return new ServiceListFactory({ services, buttonGroup, factoryMetadata });
}

export function serviceDetail(service: Service): ComponentFactory<any>[] {
  const routes: Route[] = ctx.dashboardClient.List({
    apiVersion: ServingV1,
    kind: ServingV1Route,
    namespace: service.metadata.namespace,
    selector: { "serving.knative.dev/service": service.metadata.name },
  });
  // TODO verify the route is controlled by this service
  const route = routes[0];
  const revisions: Revision[] = ctx.dashboardClient.List({
    apiVersion: ServingV1,
    kind: ServingV1Revision,
    namespace: ctx.namespace,
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
    const deployments = ctx.dashboardClient.List({
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
  const allRoutes = ctx.dashboardClient.List({
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
      factoryMetadata: {
        title: [new TextFactory({ value: "Summary" }).toComponent()],
        accessor: "summary",
      },
    }),
    new MetadataSummaryFactory({
      object: service,
      factoryMetadata: {
        title: [new TextFactory({ value: "Metadata" }).toComponent()],
        accessor: "metadata",
      },
    }),
    new RouteDataPlaneViewerFactory({
      route,
      factoryMetadata: {
        title: [new TextFactory({ value: "Data Plane" }).toComponent()],
        accessor: "dataPlane",
      },
    }),
    new ServiceResourceViewerFactory({
      service,
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

export function configurationListing(factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
  const configurations: Configuration[] = ctx.dashboardClient.List({
    apiVersion: ServingV1,
    kind: ServingV1Configuration,
    namespace: ctx.namespace,
  });
  configurations.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));

  return new ConfigurationListFactory({ configurations, factoryMetadata });
}

export function configurationDetail(configuration: Configuration): ComponentFactory<any>[] {
  const revisions: Revision[] = ctx.dashboardClient.List({
    apiVersion: ServingV1,
    kind: ServingV1Revision,
    namespace: ctx.namespace,
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
    const deployments = ctx.dashboardClient.List({
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
  const allRoutes: Route[] = ctx.dashboardClient.List({
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
      factoryMetadata: {
        title: [new TextFactory({ value: "Summary" }).toComponent()],
        accessor: "summary",
      },
      create: ctx.create,
    }),
    new MetadataSummaryFactory({
      object: configuration,
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

export function revisionDetail(revision: Revision): ComponentFactory<any>[] {
  const childDeployment: V1Deployment | undefined = ctx.dashboardClient.List({
    apiVersion: 'apps/v1',
    kind: 'Deployment',
    namespace: revision.metadata.namespace || '',
    labelSelector: {
      matchLabels: {
        'serving.knative.dev/revision': revision.metadata.name || '_',
      },
    },
  })[0];
  const pods: V1Pod[] = ctx.dashboardClient.List({
    apiVersion: 'v1',
    kind: 'Pod',
    namespace: ctx.namespace,
    selector: {
      'serving.knative.dev/revision': revision.metadata.name || '_',
    },
  });
  pods.sort((a, b) => (a.metadata?.name || '').localeCompare(b.metadata?.name || ''));

  return [
    new RevisionSummaryFactory({
      revision,
      childDeployment,
      pods,
      factoryMetadata: {
        title: [new TextFactory({ value: "Summary" }).toComponent()],
        accessor: "summary",
      },
    }),
    new MetadataSummaryFactory({
      object: revision,
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

export function routeListing(factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
  const routes: Route[] = ctx.dashboardClient.List({
    apiVersion: ServingV1,
    kind: ServingV1Route,
    namespace: ctx.namespace,
  });
  routes.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));

  return new RouteListFactory({ routes, factoryMetadata });
}

export function routeDetail(route: Route): ComponentFactory<any>[] {
  return [
    new RouteSummaryFactory({
      route,
      factoryMetadata: {
        title: [new TextFactory({ value: "Summary" }).toComponent()],
        accessor: "summary",
      },
    }),
    new MetadataSummaryFactory({
      object: route,
      factoryMetadata: {
        title: [new TextFactory({ value: "Metadata" }).toComponent()],
        accessor: "metadata",
      },
    }),
    new RouteDataPlaneViewerFactory({
      route,
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
