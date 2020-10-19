/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component } from "@project-octant/plugin/components/component";
import { FlexLayoutConfig } from "@project-octant/plugin/components/flexlayout";
import { ExtensionConfig } from "@project-octant/plugin/components/extension";
import { PodStatusConfig } from "@project-octant/plugin/components/pod-status";

/**
 * Key defines the interface expected for request keys when performing actions using the DashboadClient.
 */
export interface Key {
  namespace?: string;
  apiVersion: string;
  kind: string;
  name?: string;
  selector?: any;
  labelSelector?: LabelSelector;
}

export enum LabelSelectorOperator {
  OpIn = "In",
  OpNotIn = "NotIn",
  OpExists = "Exists",
  OpNotExists = "DoesNotExist",
}

export interface LabelSelectorRequirement {
  key: string;
  operator: LabelSelectorOperator;
  values?: string[];
}

export interface LabelSelector {
  matchLabels?: { [key: string]: string };
  matchExpressions?: LabelSelectorRequirement[];
}

/**
 * ObjectRequest defines the request object passed in to print, tab, and objectStatus handlers.
 * @property {object} object - resource of the request, for example a Pod or Deployment
 */
export interface ObjectRequest {
  readonly clientID: string;
  readonly object: any;
}

export interface PrintResponse {
  config?: { header: string; content: Component<any> }[];
  status?: { header: string; content: Component<any> }[];
  items?: { width: number; view: Component<any> }[];
  error?: string;
}

export interface Tab {
  name: string;
  contents: Component<FlexLayoutConfig>;
}

export interface TabResponse {
  tab: Tab;
}

export interface ObjectStatusResponse {
  objectStatus: Component<PodStatusConfig>;
}

/**
 * ActionRequest defines the request object passed in to an action handler.
 * @property {string} actionName - name of the action being sent, match this to dispatch to different handlers.
 * @property {any} payload - action payload
 */
export interface ActionRequest {
  readonly clientID: string;
  readonly actionName: string;
  readonly payload: any;
}

/**
 * ContentRequest defines the request object passed in to a content handler.
 * @property {string} contentPath - full content path of the request, parse this to handle child navigation.
 */
export interface ContentRequest {
  readonly clientID: string;
  readonly contentPath: string;
}

export interface ActionResponse {
  error?: string;
}

/**
 * Ref defines the a reference to an object in Octant and is used with the DashboardClient.RefPath
 * method for generating links to resources in Octant.
 * @property {string} apiVersion - apiVersion of the resource
 * @property {string} kind - kind of the resource
 * @property {string} name - name of the resource
 * @property {string} namespace - namespace of the resource
 */
export interface Ref {
  apiVersion: string;
  kind: string;
  name: string;
  namespace: string;
}

/**
 * DashboardClient provides API operations to Octant plugins.
 */
export interface DashboardClient {
  /**
   * Get attempts to fetch a resource using the key provided
   * @param key - the key of the object to be fetched
   * @throws will throw an exception if there is an error with the request
   */
  Get(key: Key): any;
  /**
   * List attempts to fetch a list of all the resources matching the provided key
   * @param key - the key of the objects to list
   * @throws will throw an exception if there is an error during the request
   */
  List(key: Key): any[];
  /**
   * Update will apply the YAML in to the provided namespace. Use this to Create and Update resources in the cluster.
   * When there are multiple resources in the YAML, they will be applied in order.
   * If an error is encountered an exception will be throw and no further resources will be applied.
   * @param namespace - namespace for the resource, if empty, current Octant namespace will be used, if
   * namespace is set in the YAMl that will always take precedence over this param
   * @param yaml - YAML to apply, can contain multiple resources
   * @throws will throw an exception if there is an error during the request
   */
  Update(namespace: string, yaml: string): string;
  /**
   * Delete deletes a an object identified by the key.
   * @param key The key of the object to be deleted
   * @throws Will throw an exception if the key is invalid or the delete fails.
   */
  Delete(key: Key): never;
  /**
   * RefPath generates an Octant reference path using the details of the Ref provided.
   * @param object - object to renerate the reference path for. Reference paths can be used with LinkFactory to
   * create links to resources in Octant
   */
  RefPath(object: Ref): string;
  /**
   * SendEvent will send an event to the clientID provided.
   * @param clientID the clientID the event should be sent to
   * @param eventType the eventType, e.g. event.octant.dev/alert, see pkg/event/event.go for a full list
   * @param payload the payload for the event.
   */
  SendEvent(
    clientID: string,
    eventType: string,
    payload: { [key: string]: string | number }
  ): void;
}

/**
 * HTTPClient defines a client for making HTTP calls from within the Octant plugin runtime.
 * @method get - GET a url as a string
 * @method getJSON - GET a url as JSON
 */
export interface HTTPClient {
  /**
   * call HTTP GET for a given URL and return the response as a string
   * @param url request url
   * @param callback response callback
   * @throws will throw an exception if the request fails
   */
  get(url: string, callback: (response: string) => void): string;
  /**
   * call HTTP GET for a given URL and return the response as JSON
   * @param url request url
   * @param callback response callback
   * @throws will throw an exception if the request fails
   */
  getJSON(url: string, callback: (response: string) => void): any;
}

/**
 * Plugin defines the expected interface for Octant TypeScript plugins.
 * @property {string} name - title of the plugin
 * @property {string} description - description of the plugin
 * @property {boolean} isModule - is this a module plugin, used for custom navigation and content
 * @property {Capabilities} capabilities - declare the plugin capabilities
 */
export interface Plugin {
  name: string;
  description: string;
  isModule: boolean;

  readonly dashboardClient: DashboardClient;
  readonly httpClient: HTTPClient;

  capabilities: Capabilities;

  tabHandler?: (request: ObjectRequest) => TabResponse;
  printHandler?: (request: ObjectRequest) => PrintResponse;
  objectStatusHandler?: (request: ObjectRequest) => ObjectStatusResponse;
  navigationHandler?: () => Navigation;
  contentHandler?: (request: ContentRequest) => ContentResponse;
  actionHandler?: (request: ActionRequest) => ActionResponse | void;
}

/**
 * PluginConstructor defines the expected constructor signature for Octant TypeScript plugins.
 * The dashboard and http clients are injected in to the constructor by the plugin runtime.
 * @param dashboardClient client for interacting with the Kubernetes API
 * @param httpClient client for making HTTP calls
 */
export interface PluginConstructor {
  new (dashboardClient: DashboardClient, httpClient: HTTPClient): Plugin;
}

export interface GroupVersionKind {
  group?: string;
  version: string;
  kind: string;
}

/**
 * Capabilities defines the expected interface for declaring what an Octant plugin can do.
 */
export interface Capabilities {
  supportPrinterConfig?: GroupVersionKind[];
  supportPrinterStatus?: GroupVersionKind[];
  supportPrinterItems?: GroupVersionKind[];
  supportObjectStatus?: GroupVersionKind[];
  supportTab?: GroupVersionKind[];
  actionNames?: string[];
}

/**
 * Navigation defines the expected object for the Navigation handler for module plugins.
 */
export interface Navigation {
  module?: string;
  title: string;
  path: string;

  children?: Navigation[];
  iconName?: string;
  isLoading?: boolean;
}

/**
 * ContentResponse is used by module plugins for rendering custom content views.
 */
export interface ContentResponse {
  content: Content;
}

interface GridAction {
  name: string;
  actionPath: string;
  payload: { [key: string]: any };
  confirmation?: {
    title: string;
    body: string;
  };
  type: string;
}

export interface PathItem {
  title: string;
  url?: string;
}

export interface Content {
  extensionComponent?: Component<ExtensionConfig>;
  viewComponents: View[];
  title: View[];
  buttonGroup?: View;
}

export interface Metadata {
  type: string;
  title?: View[];
  accessor?: string;
}

export interface View {
  metadata: Metadata;
  totalItems?: number;
}
