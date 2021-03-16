/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// core-js and regenerator-runtime are requried to ensure the correct polyfills
// are applied by babel/webpack.
import "core-js/stable";
import "regenerator-runtime/runtime";

import RouteRecognizer from "route-recognizer";

// plugin contains interfaces your plugin can expect
// this includes your main plugin class, response, requests, and clients.
import * as octant from "@project-octant/plugin";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

// components
import { notFoundContentResponse } from "./components/not-found";
import { knativeLinker } from "./components/linker";

import { V1ObjectReference } from "@kubernetes/client-node";

import {
  configurationDetailContentHandler,
  configurationListingContentHandler,
  configureActionHandler,
  newServiceActionHandler,
  revisionDetailContentHandler,
  revisionListContentHandler,
  routeDetailContentHandler,
  routeListingContentHandler,
  serviceDetailContentHandler,
  serviceListingContentHandler,
  servingOverviewContentHandler,
} from "./serving";
import {
  brokerDetailContentHandler,
  brokerListingContentHandler,
  sourceDetailContentHandler,
  sourcesListingContentHandler,
  sourceTypeListingContentHandler,
  triggerDetailContentHandler,
  triggerListingContentHandler,
} from "./eventing";

import ctx from "./context";

export default class KnativePlugin implements octant.Plugin {
  // Static fields that Octant uses
  name = "knative";
  description = "Knative plugin for Octant";

  // If true, the contentHandler and navigationHandler will be called.
  isModule = true;

  // Octant will assign these via the constructor at runtime.
  dashboardClient: octant.DashboardClient;
  httpClient: octant.HTTPClient;
  router: RouteRecognizer;

  // Plugin capabilities
  capabilities = {
    actionNames: [
      "knative.dev/configure",
      "knative.dev/newService",
      "knative.dev/setContentPath",
      "action.octant.dev/setNamespace",
    ],
    supportPrinterConfig: [],
    supportTab: [],
  };

  // Octant expects plugin constructors to accept two arguments, the dashboardClient and the httpClient
  constructor(
    dashboardClient: octant.DashboardClient,
    httpClient: octant.HTTPClient
  ) {
    ctx.dashboardClient = this.dashboardClient = dashboardClient;
    ctx.httpClient = this.httpClient = httpClient;
    ctx.linker = (ref: V1ObjectReference, context?: V1ObjectReference) => knativeLinker(ctx.dashboardClient.RefPath, ref, context);

    this.router = new RouteRecognizer();
    this.router.add([{
      path: "/_create",
      handler: (params: any) => {
        ctx.create = true;
        ctx.dashboardClient.SendEvent(params.clientID, "event.octant.dev/contentPath", { contentPath: "/knative" });
        return h.createContentResponse([], []);
      }
    }]);
    this.router.add([{ path: "/eventing/sources", handler: sourcesListingContentHandler }]);
    this.router.add([{ path: "/eventing/sources/:sourceType", handler: sourceTypeListingContentHandler }]);
    this.router.add([{ path: "/eventing/sources/:sourceType/:sourceName", handler: sourceDetailContentHandler }]);
    this.router.add([{ path: "/eventing/brokers", handler: brokerListingContentHandler }]);
    this.router.add([{ path: "/eventing/brokers/:brokerName", handler: brokerDetailContentHandler }]);
    this.router.add([{ path: "/eventing/triggers", handler: triggerListingContentHandler }]);
    this.router.add([{ path: "/eventing/triggers/:triggerName", handler: triggerDetailContentHandler }]);
    this.router.add([{ path: "/serving", handler: servingOverviewContentHandler }]);
    this.router.add([{ path: "/serving/services", handler: serviceListingContentHandler }]);
    this.router.add([{ path: "/serving/services/:serviceName", handler: serviceDetailContentHandler }]);
    this.router.add([{ path: "/serving/services/:serviceName/revisions", handler: revisionListContentHandler }]);
    this.router.add([{ path: "/serving/services/:serviceName/revisions/:revisionName", handler: revisionDetailContentHandler }]);
    this.router.add([{ path: "/serving/configurations", handler: configurationListingContentHandler }]);
    this.router.add([{ path: "/serving/configurations/:configurationName", handler: configurationDetailContentHandler }]);
    this.router.add([{ path: "/serving/configurations/:configurationName/revisions", handler: revisionListContentHandler }]);
    this.router.add([{ path: "/serving/configurations/:configurationName/revisions/:revisionName", handler: revisionDetailContentHandler }]);
    this.router.add([{ path: "/serving/routes", handler: routeListingContentHandler }]);
    this.router.add([{ path: "/serving/routes/:routeName", handler: routeDetailContentHandler }]);
  }

  actionHandler(request: octant.ActionRequest): octant.ActionResponse | void {
    // observe namespace switches
    if (request.actionName === "action.octant.dev/setNamespace") {
      ctx.namespace = request.payload.namespace;
      return;
    }

    // redirect the client to a new path
    if (request.actionName === "knative.dev/setContentPath") {
      ctx.dashboardClient.SendEvent(request.payload.clientID, "event.octant.dev/contentPath", { contentPath: request.payload.contentPath });
      return;
    }

    // update a service or configuration
    if (request.actionName === "knative.dev/configure") {
      return configureActionHandler(request);
    }

    // create a new service
    if (request.actionName === "knative.dev/newService") {
      return newServiceActionHandler(request);
    }

    return;
  }

  // render a content response for a request
  contentHandler(request: octant.ContentRequest): octant.ContentResponse {
    const { contentPath, clientID } = request;

    if (contentPath === "") {
      // the router isn't able to match this path for some reason, so hard code it

      // TODO return the knative overview handler once we also support eventing
      // return knativeOverviewHandler(request);

      // redirect to the serving overview for now
      ctx.dashboardClient.SendEvent(clientID, "event.octant.dev/contentPath", { contentPath: "/knative/serving" });
      return h.createContentResponse([], []);
    }

    if (contentPath == "/eventing") {
      // TODO return overiview handler when it exists

      // redirect to sources in the interim
      ctx.dashboardClient.SendEvent(clientID, "event.octant.dev/contentPath", { contentPath: "/knative/eventing/sources" })
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
      console.error(`Error rendering Knative plugin content path "${contentPath}": `, e);
      return notFoundContentResponse({ contentPath });
    }
  }

  navigationHandler(): octant.Navigation {
    // TODO pick better icons
    let nav = new h.Navigation("Knative", "knative", "cloud");
    nav.add("Services", "serving/services");
    nav.add("Configurations", "serving/configurations");
    nav.add("Routes", "serving/routes");
    nav.add("Sources", "eventing/sources");
    nav.add("Brokers", "eventing/brokers");
    nav.add("Triggers", "eventing/triggers");
    return nav;
  }

  // unused plugin methods

  printHandler(request: octant.ObjectRequest): octant.PrintResponse {
    throw new Error('KnativePlugin#printHandler should never be called');
  }

  tabHandler(request: octant.ObjectRequest): octant.TabResponse {
    throw new Error('KnativePlugin#tabHandler should never be called');
  }

}

console.log("loading knative.ts");
