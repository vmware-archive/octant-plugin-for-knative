/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import RouteRecognizer from "route-recognizer";
import * as octant from "@project-octant/plugin";

import {
  ComponentFactory,
  FactoryMetadata,
} from "@project-octant/plugin/components/component-factory";
import { GridActionsFactory } from "@project-octant/plugin/components/grid-actions";
import { ButtonGroupFactory } from "@project-octant/plugin/components/button-group";
import { FlexLayoutFactory } from "@project-octant/plugin/components/flexlayout";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { TableFactory } from "@project-octant/plugin/components/table";
import { Component } from "@project-octant/plugin/components/component";
import { LinkConfig, LinkFactory } from "@project-octant/plugin/components/link";
import { TextFactory } from "@project-octant/plugin/components/text";

/**
 * RowData represents a single set of user row data in a table.
 */
export type RowData = { [key: string]: ComponentFactory<any> };

/**
 * TableRow holds the data for a single row in a table and optionally and grid actions for that row.
 * Setting isDeleted to true will result in the deleting indictor style being applied to the row.
 */
export class TableRow {
  data: RowData;
  gridActions: GridActionsFactory | undefined;
  isDeleting: boolean | undefined;

  constructor(
    rowData: RowData,
    options?: { gridActions?: GridActionsFactory; isDeleting?: boolean }
  ) {
    this.data = rowData;
    this.gridActions = options?.gridActions;
    this.isDeleting = options?.isDeleting;
  }
}

/**
 * TableFilters represents any local data filters the table should render with.
 */
export type TableFilters = {
  [key: string]: {
    values: string[];
    selected: string[];
  };
};

/**
 * createPrintResponse generates a PrintResponse
 * @param config config will be appended to the Config card of the resource summary
 * @param status status will be appended to the Status card of the resource summary
 * @param items an Array of components to add to the resource summary
 */
export const createPrintResponse = (
  config?: SummaryFactory,
  status?: SummaryFactory,
  items?: { width: number; view: ComponentFactory<any> }[]
): octant.PrintResponse => {
  return {
    config: config ? config?.toComponent().config.sections : [],
    status: status ? status?.toComponent().config.sections : [],
    items: items
      ? items?.map((i) => {
          return { width: i.width, view: i.view.toComponent() };
        })
      : [],
  };
};

/**
 * createTabResponse generates a TabResponse
 * @param name title to display on the tab
 * @param contents a flex layout factory that will be rendered as the tab contents
 */
export const createTabResponse = (
  name: string,
  contents: FlexLayoutFactory
): octant.TabResponse => {
  return {
    tab: {
      name: name,
      contents: contents.toComponent(),
    },
  };
};

/**
 * createContentResponse generates a ContentResponse
 * @param title title of the page, this is rendered directly above the content
 * @param bodyComponents an Array of ComponentFactory that will be rendered using toComponent()
 * @param buttonGroup global action buttons to display, these render on the same row as the title
 */
export const createContentResponse = (
  title: ComponentFactory<any>[],
  bodyComponents: ComponentFactory<any>[],
  buttonGroup?: ButtonGroupFactory
): octant.ContentResponse => {
  return {
    content: {
      title: title.map((t) => t.toComponent()),
      viewComponents: bodyComponents.map((c) => c.toComponent()),
      ...(buttonGroup && { buttonGroup: buttonGroup.toComponent() }),
    },
  };
};

/**
 * contentResponseFromRouter will attempt to lookup the handler for the request.contentPath
 * from the RouteRecgnizer. Route handlers are expected to have the following signatures:
 *
 *  this: {
 *     dashboardClient: octant.DashboardClient;
 *     httpClient: octant.HTTPClient;
 *  },
 *  params: any,
 *  request: octant.ContentRequest
 *
 * @param request the current ContentRequest
 * @param router a RouteRecognizer
 */
export const contentResponseFromRouter = (
  plugin: octant.Plugin,
  router: RouteRecognizer,
  request: octant.ContentRequest
): octant.ContentResponse => {
  // routes defined in routes.ts
  // handlers defined in content.ts
  const contentPath = request.contentPath;

  // Default case, no extra path.
  if (contentPath === "") {
    if (router.hasRoute("default")) {
      const handlers = router.handlersFor("default");
      try {
        if (handlers.length > 1) {
          throw new Error("root: more than one default handler found");
        }
        const { handler, params } = handlers[0];
        return handler.call(plugin, Object.assign({}, request, params));
      } catch (e) {
        const title = [
          new TextFactory({ value: "Error Routing" }),
          new TextFactory({ value: request.contentPath }),
        ];
        return createContentResponse(title, [
          new TextFactory({
            value: JSON.stringify(e),
          }),
        ]);
      }
    }
  }

  // Not found case
  const results: any = router.recognize(contentPath);
  if (!results) {
    if (router.hasRoute("notFound")) {
      const handlers = router.handlersFor("notFound");
      try {
        if (handlers.length > 1) {
          throw new Error("no match: more than one notFound handler found");
        }
        const { handler, params } = handlers[0];
        return handler.call(plugin, Object.assign({}, request, params));
      } catch (e) {
        const title = [
          new TextFactory({ value: "Error Routing" }),
          new TextFactory({ value: request.contentPath }),
        ];
        return createContentResponse(title, [
          new TextFactory({
            value: JSON.stringify(e),
          }),
        ]);
      }
    } else {
      const title = [
        new TextFactory({ value: "Not Found" }),
        new TextFactory({ value: request.contentPath }),
      ];
      return createContentResponse(title, [
        new TextFactory({
          value: "Not found: " + request.contentPath,
          factoryMetadata: { title: title.map((e) => e.toComponent()) },
        }),
      ]);
    }
  }

  // Dispatch to route handler
  const { handler, params } = results[0];
  try {
    return handler.call(plugin, Object.assign({}, request, params));
  } catch (e) {
    try {
      const handlers = router.handlersFor("notFound");
      if (handlers.length > 1) {
        throw new Error("dispatch: more than one notFound handler found");
      }
      return handlers[0]();
    } catch (e) {
      throw e;
    }
  }
};

/**
 * Width of the component
 */
export enum Width {
  Half = 12,
  Full = 24,
}

/**
 * Navigation is a class for defining the navigation menu for module plugins.
 */
export class Navigation implements octant.Navigation {
  title: string;
  path: string;
  iconName?: string;

  children: octant.Navigation[];

  /**
   *
   * @param title display title for navigation, usually your plugin name as a Title
   * @param rootPath root path for your plugin, consider namespacing, e.g. octant.dev-my-plugin
   * @param icon clarity icon name (https://clarity.design/icons#core-shapes)
   */
  constructor(title: string, rootPath: string, icon?: string) {
    this.title = title;
    this.path = "/" + rootPath;
    this.iconName = icon;
    this.children = [];
  }

  /**
   *
   * @param title display title for child menu entry
   * @param path path for child menu entry
   * @param icon clarity icon name (https://clarity.design/icons#core-shapes)
   */
  add(title: string, path: string, icon?: string) {
    this.children.push({
      title: title,
      path: this.path + "/" + path,
      iconName: icon,
    });
  }
}

/**
 * TableFactoryBuilder aids in building TableFactory instances.
 */
export class TableFactoryBuilder {
  private _title: ComponentFactory<any>[];
  private _columns: string[];
  private _rows: TableRow[];
  private _emptyContent: string;
  private _loading: boolean;
  private _filters: TableFilters;
  private _buttonGroup?: ButtonGroupFactory;
  private factoryMetadata: FactoryMetadata | undefined;

  /**
   * @param title Title for the component
   * @param columns titles for each column in the table
   * @param rows initial set of rows
   * @param emptyContent message to display when there are no rows, defaults to "No results found!"
   * @param loading display the loading indicator on the table
   * @param filters set any data filters on the table
   * @param factoryMetadata allows for changing the title or accessor of the underlying TableFactory
   */
  constructor(
    title: ComponentFactory<any>[],
    columns: string[],
    rows?: TableRow[],
    emptyContent?: string,
    loading?: boolean,
    filters?: TableFilters,
    factoryMetadata?: FactoryMetadata
  ) {
    this._title = title;
    this._columns = columns;
    this._rows = rows ? rows : [];
    this._emptyContent = emptyContent ? emptyContent : "No results found!";
    this._loading = loading ? loading : false;
    this._filters = filters ? filters : {};
    this.factoryMetadata = factoryMetadata;
  }

  /**
   * @property {string} title message to dispaly when there is no table content
   */
  public get title(): ComponentFactory<any>[] {
    return this._title;
  }
  public set title(title: ComponentFactory<any>[]) {
    this._title = title;
  }

  /**
   * @property {string} emptyContent message to dispaly when there is no table content
   */
  public get emptyContent(): string {
    return this._emptyContent;
  }
  public set emptyContent(message: string) {
    this._emptyContent = message;
  }

  /**
   * @property {boolean} loading display the loading indictor when displaying the table
   */
  public get loading(): boolean {
    return this._loading;
  }
  public set loading(loading: boolean) {
    this._loading = loading;
  }

  /**
   * @property {TableFilters} filters client side data filters for the table
   */
  public get filters(): TableFilters {
    return this._filters;
  }
  public set filters(f: TableFilters) {
    this._filters = f;
  }

  /**
   * @property {string[]} columns table columns are used as header titles and to populate table data from TableRow objects.
   */
  public get columns(): string[] {
    return this._columns;
  }
  public set columns(c: string[]) {
    this._columns = c;
  }

  /**
   * @property {ButtonGroupFactory | undefined} buttonGroup action buttons rendered next to the table header.
   */
  public get buttonGroup(): ButtonGroupFactory | undefined {
    return this._buttonGroup;
  }
  public set buttonGroup(b: ButtonGroupFactory | undefined) {
    this._buttonGroup = b;
  }

  /**
   *
   * @param rows a TableRow or Array of TableRow to push in to the table.
   */
  public push(rows: TableRow | TableRow[]) {
    if (Array.isArray(rows)) {
      rows.forEach((element) => {
        this._rows.push(element);
      });
    } else {
      this._rows.push(rows);
    }
  }

  /**
   * @returns a new TableFactory
   */
  public getFactory(): TableFactory {
    const columns = this._columns.map((name: string) => ({
      name: name,
      accessor: name,
    }));

    const rows = this._rows.map((row) => {
      let componentRow = {} as { [key: string]: any };
      Object.keys(row.data).forEach((v) => {
        componentRow[v] = row.data[v].toComponent();
      });
      if (row.gridActions) {
        componentRow["_action"] = row.gridActions.toComponent();
      }
      if (row.isDeleting) {
        componentRow["_isDeleted"] = new TextFactory({
          value: "deleted",
        }).toComponent();
      }
      return componentRow;
    });

    const emptyContent = this.emptyContent;
    const loading = this.loading;

    let factoryMetadata = this.factoryMetadata;
    if (!factoryMetadata) {
      factoryMetadata = { title: this._title.map((t) => t.toComponent()) };
    }

    return new TableFactory({
      columns,
      rows,
      emptyContent,
      loading: loading,
      filters: {},
      options: {
        ...(this._buttonGroup && { buttonGroup: this._buttonGroup.toComponent() }),
      },
      factoryMetadata,
    });
  }
}

export const refFromObject = (object: any): octant.Ref => {
  const ref: octant.Ref = {
    namespace: object.metadata.namespace,
    apiVersion: object.apiVersion,
    kind: object.kind,
    name: object.metadata.name,
  };
  return ref;
};

/**
 * genLinkFromObject generates an Octant link to a resource. This helper wraps
 * genLink and attempts to create a Ref object from the object passed in.
 * @param object resource with metadata, kind, and apiVersion defined.
 * @param client DashboardClient
 */
export const genLinkFromObject = <T>(
  object: any,
  client: octant.DashboardClient
): Component<LinkConfig> => {
  return genLink(refFromObject(object), client);
};

/**
 *
 * @param ref Ref object to generate a link from.
 * @param client DashboardClient
 */
export const genLink = (
  ref: octant.Ref,
  client: octant.DashboardClient
): Component<LinkConfig> => {
  const path = client.RefPath(ref);
  return new LinkFactory({ value: ref.name, ref: path }).toComponent();
};
