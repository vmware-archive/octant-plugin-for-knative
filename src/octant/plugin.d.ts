/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component } from "./component";
import { FlexLayoutConfig } from "./flexlayout";
import { ExtensionConfig } from "./extension";
import { ButtonGroupConfig } from "./button-group";
import { PodStatusConfig } from "./pod-status";
import { SummaryConfig } from "./summary";

export interface Key {
  namespace?: string;
  apiVersion: string;
  kind: string;
  name?: string;
  selector?: object;
}

export interface ObjectRequest {
  readonly client: DashboardClient;
  readonly object: object;
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

export interface ActionRequest {
  client: DashboardClient;
  actionName: string;
  payload: any;
}

export interface ContentRequest {
  client: DashboardClient;
  contentPath: string;
}

export interface ActionResponse {
  error?: string;
}

export interface DashboardClient {
  Get(key: Key): any;
  List(key: Key): any[];
  Update(namespace: string, yaml: string): string;

  /**
   * Delete deletes a an object identified by the key.
   * @param key The key of the object to be deleted
   * @throws Will throw an exception if the key is invalid or the delete fails.
   */
  Delete(key: Key): never;
  RefPath(object: any): string;
}

export interface HTTPClient {
  get(url: string, callback: (response: string) => void): string;
  getJSON(url: string, callback: (response: string) => void): any;
}

export interface PluginConstructor {
  new (dashboardClient: DashboardClient, httpClient: HTTPClient): Plugin;
}

export interface Plugin {
  name: string;
  description: string;
  isModule: boolean;

  capabilities: Capabilities;

  tabHandler?: (request: ObjectRequest) => TabResponse;
  printHandler?: (request: ObjectRequest) => PrintResponse;
  objectStatusHandler?: (request: ObjectRequest) => ObjectStatusResponse;
  navigationHandler?: () => Navigation;
  contentHandler?: (request: ContentRequest) => ContentResponse;
  actionHandler?: (request: ActionRequest) => ActionResponse | void;
}

export interface GroupVersionKind {
  group?: string;
  version: string;
  kind: string;
}

export interface Capabilities {
  supportPrinterConfig?: GroupVersionKind[];
  supportPrinterStatus?: GroupVersionKind[];
  supportPrinterItems?: GroupVersionKind[];
  supportObjectStatus?: GroupVersionKind[];
  supportTab?: GroupVersionKind[];
  actionNames?: string[];
}

export interface Navigation {
  module?: string;
  title: string;
  path: string;

  children?: Navigation[];
  iconName?: string;
  isLoading?: boolean;
}

export interface ContentResponse {
  content: Content;
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
