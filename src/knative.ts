/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// core-js and regenerator-runtime are requried to ensure the correct polyfills
// are applied by babel/webpack.
import "core-js/stable";
import "regenerator-runtime/runtime";

import YAML from "yaml";

// plugin contains interfaces your plugin can expect
// this includes your main plugin class, response, requests, and clients.
import * as octant from "./octant/plugin";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "./octant/component-helpers";

// components
import { ComponentFactory, FactoryMetadata } from "./octant/component-factory";
import { EditorFactory } from "./octant/editor";
import { TextFactory } from "./octant/text";
import { LinkFactory } from "./octant/link";
import { ListFactory } from "./octant/list";

import { Configuration, ConfigurationListFactory } from "./serving/configuration";
import { Revision } from "./serving/revision";
import { RouteListFactory, Route } from "./serving/route";
import { Service, ServiceListFactory, ServiceSummaryFactory } from "./serving/service";

export default class MyPlugin implements octant.Plugin {
  // Static fields that Octant uses
  name = "knative";
  description = "Knative plugin for Octant";

  // If true, the contentHandler and navigationHandler will be called.
  isModule = true;;

  // Octant will assign these via the constructor at runtime.
  dashboardClient: octant.DashboardClient;
  httpClient: octant.HTTPClient;

  // Plugin capabilities
  capabilities = {
    supportPrinterConfig: [],
    supportTab: [],
    actionNames: ["knative/testAction", "action.octant.dev/setNamespace"],
  };

  // Custom plugin properties
  namespace: string;

  // Octant expects plugin constructors to accept two arguments, the dashboardClient and the httpClient
  constructor(
    dashboardClient: octant.DashboardClient,
    httpClient: octant.HTTPClient
  ) {
    this.dashboardClient = dashboardClient;
    this.httpClient = httpClient;

    this.namespace = "default";
  }

  printHandler(request: octant.ObjectRequest): octant.PrintResponse {
    throw new Error('KnativePlugin#printHandler should never be called');
  }

  actionHandler(request: octant.ActionRequest): octant.ActionResponse | void {
    if (request.actionName === "action.octant.dev/setNamespace") {
      this.namespace = request.payload.namespace;
      return;
    }

    return;
  }

  tabHandler(request: octant.ObjectRequest): octant.TabResponse {
    throw new Error('KnativePlugin#tabHandler should never be called');
  }

  navigationHandler(): octant.Navigation {
    let nav = new h.Navigation("Knative", "knative", "cloud");
    nav.add("Services", "services");
    nav.add("Configurations", "configurations");
    nav.add("Routes", "routes");
    return nav;
  }

  contentHandler(request: octant.ContentRequest): octant.ContentResponse {
    const { contentPath } = request;

    // TODO use a proper path router
    if (contentPath === "") {
      return this.knativeOverviewHandler(request);
    } else if (contentPath === "/services") {
      return this.serviceListingHandler(request);
    } else if (contentPath.startsWith("/services/")) {
      return this.serviceDetailHandler(request);
    } else if (contentPath === "/configurations") {
      return this.configurationListingHandler(request);
    } else if (contentPath === "/routes") {
      return this.routeListingHandler(request);
    }

    // not found
    let notFound = new TextFactory({ value: `Not Found - ${contentPath}` });
    return h.createContentResponse([notFound], [notFound])
  }

  knativeOverviewHandler(request: octant.ContentRequest): octant.ContentResponse {
    const title = [new TextFactory({ value: "Knative" })];
    const body = new ListFactory({
      factoryMetadata: {
        title: title.map(f => f.toComponent()),
      },
      items: [
        this.serviceListing({
          title: [new TextFactory({ value: "Services" }).toComponent()],
        }).toComponent(),
        this.configurationListing({
          title: [new TextFactory({ value: "Configurations" }).toComponent()],
        }).toComponent(),
        this.routeListing({
          title: [new TextFactory({ value: "Routes" }).toComponent()],
        }).toComponent(),
      ],
    })
    return h.createContentResponse(title, [body]);
  }

  serviceListingHandler(request: octant.ContentRequest): octant.ContentResponse {
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new TextFactory({ value: "Services" }),
    ];
    const body = new ListFactory({
      items: [
        this.serviceListing({
          title: [new TextFactory({ value: "Services" }).toComponent()],
        }).toComponent(),
      ],
      factoryMetadata: {
        title: title.map(f => f.toComponent()),
      },
    })
    return h.createContentResponse(title, [body]);
  }

  serviceDetailHandler(request: octant.ContentRequest): octant.ContentResponse {
    const name = request.contentPath.split("/")[2];
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
      new LinkFactory({ value: "Services", ref: "/knative/services" }),
      new TextFactory({ value: name }),
    ];
    const body = this.serviceDetail(name);
    return h.createContentResponse(title, body);
  }

  configurationListingHandler(request: octant.ContentRequest): octant.ContentResponse {
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
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
    })
    return h.createContentResponse(title, [body]);
  }

  routeListingHandler(request: octant.ContentRequest): octant.ContentResponse {
    const title = [
      new LinkFactory({ value: "Knative", ref: "/knative" }),
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
    })
    return h.createContentResponse(title, [body]);
  }

  serviceListing(factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
    const services: Service[] = this.dashboardClient.List({
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Service',
      namespace: this.namespace,
    });
    services.sort((a, b) => a.metadata.name < b.metadata.name ? -1 : 1);

    return new ServiceListFactory({ services, factoryMetadata });
  }

  serviceDetail(name: string): ComponentFactory<any>[] {
    const service: Service = this.dashboardClient.Get({
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Service',
      namespace: this.namespace,
      name: name,
    });
    const revisions: Revision[] = this.dashboardClient.List({
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Revision',
      namespace: this.namespace,
      selector: {
        'serving.knative.dev/service': service.metadata.name,
      },
    });
    revisions.sort((a, b) => parseInt(a.metadata.labels['serving.knative.dev/configurationGeneration']) - parseInt(b.metadata.labels['serving.knative.dev/configurationGeneration']));

    return [
      new ServiceSummaryFactory({
        service,
        revisions,
        factoryMetadata: {
          title: [new TextFactory({ value: "Summary" }).toComponent()],
          accessor: "summary",
        },
      }),
      new EditorFactory({
        value: "---\n" + YAML.stringify(JSON.parse(JSON.stringify(service)), { sortMapEntries: true }),
        readOnly: false,
        metadata: {
          apiVersion: service.apiVersion,
          kind: service.kind,
          namespace: service.metadata.namespace,
          name: service.metadata.name,
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
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Configuration',
      namespace: this.namespace,
    });
    configurations.sort((a, b) => a.metadata.name < b.metadata.name ? -1 : 1);

    return new ConfigurationListFactory({ configurations, factoryMetadata });
  }

  routeListing(factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
    const routes: Route[] = this.dashboardClient.List({
      apiVersion: 'serving.knative.dev/v1',
      kind: 'Route',
      namespace: this.namespace,
    });
    routes.sort((a, b) => a.metadata.name < b.metadata.name ? -1 : 1);

    return new RouteListFactory({ routes, factoryMetadata });
  }

}

console.log("loading knative.ts");
