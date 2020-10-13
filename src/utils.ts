/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

import * as octant from "@project-octant/plugin";

import { V1ContainerPort, V1EnvVar, V1ObjectMeta, V1ObjectReference, V1PodTemplateSpec, V1VolumeMount } from "@kubernetes/client-node";
import { RuntimeObject } from "./metadata";
import { PortFactory } from "@project-octant/plugin/components/port";
import { PortsFactory } from "@project-octant/plugin/components/ports";
import { TableFactory } from "@project-octant/plugin/components/table";
import { TextFactory } from "@project-octant/plugin/components/text";
import { TableFilters, TableRow } from "@project-octant/plugin/helpers";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { ButtonGroupFactory } from "@project-octant/plugin/components/button-group";
import { Component } from "@project-octant/plugin/components/component";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { ListFactory } from "@project-octant/plugin/components/list";
import { Condition } from "./serving/conditions";

export const ServingV1 = "serving.knative.dev/v1";
export const ServingV1Service = "Service";
export const ServingV1Configuration = "Configuration";
export const ServingV1Revision = "Revision";
export const ServingV1Route = "Route";

export interface PodSpecable {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    template: V1PodTemplateSpec;
  };
  status: {
    conditions?: Condition[];
  };
}

// TODO remove after https://github.com/vmware-tanzu/plugin-library-for-octant/pull/7
export interface EditorConfig {
  value: string;
  language: string;
  readOnly: boolean;
  metadata: { [key: string]: string };
  submitAction?: string;
  submitLabel?: string;
}

export interface EditorOptions {
  submitAction?: string;
  submitLabel?: string;
}

interface EditorParameters {
  value: string;
  language: string;
  readOnly: boolean;
  metadata: { [key: string]: string };
  options?: EditorOptions;
  factoryMetadata?: FactoryMetadata;
}

export class EditorFactory implements ComponentFactory<EditorConfig> {
  private readonly value: string;
  private readonly language: string;
  private readonly readOnly: boolean;
  private readonly metadata: { [key: string]: string };
  private readonly submitAction: string | undefined;
  private readonly submitLabel: string | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({
    value,
    language,
    readOnly,
    metadata,
    options,
    factoryMetadata,
  }: EditorParameters) {
    this.value = value;
    this.language = language;
    this.readOnly = readOnly;
    this.metadata = metadata;
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.submitAction = options.submitAction;
      this.submitLabel = options.submitLabel;
    }
  }

  toComponent(): Component<EditorConfig> {
    return {
      metadata: {
        type: 'editor',
        ...this.factoryMetadata,
      },
      config: {
        value: this.value,
        language: this.language,
        readOnly: this.readOnly,
        metadata: this.metadata,

        ...(this.submitAction && { submitAction: this.submitAction }),
        ...(this.submitLabel && { submitLabel: this.submitLabel }),
      },
    };
  }
}

// TODO remove after https://github.com/vmware-tanzu/plugin-library-for-octant/pull/7
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

// TODO remove after https://github.com/vmware-tanzu/plugin-library-for-octant/issues/2
export interface DashboardClient extends octant.DashboardClient {
  SendEvent(clientID: string, eventType: string, payload: any): string; 
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

export function deleteGridAction(obj: RuntimeObject): GridAction {
  return {
    name: "Delete",
    actionPath: "action.octant.dev/deleteObject",
    payload: {
      apiVersion: obj.apiVersion,
      kind: obj.kind,
      namespace: obj.metadata.namespace,
      name: obj.metadata.name,
    },
    confirmation: {   
      title: `Delete ${obj.kind}`,
      body: `Are you sure you want to delete *${obj.kind}* **${obj.metadata.name}**? This action is permanent and cannot be recovered.`,
    },
    type: "danger",
  };
}

export function knativeLinker(linker: (ref: octant.Ref) => string, ref: V1ObjectReference, context?: V1ObjectReference): string {
  if (!ref.apiVersion?.startsWith("serving.knative.dev/")) {
    return linker(ref as octant.Ref);
  }
  return [context, ref].reduce((contentPath: string, ref: V1ObjectReference | undefined) => {
    if (!ref) {
      return contentPath;
    }
    if (ref.kind) {
      contentPath = `${contentPath}/${ref.kind?.toLowerCase()}s`;
    }
    if (ref.name) {
      contentPath = `${contentPath}/${ref.name}`;
    }
    return contentPath;
  }, "/knative/serving");
}

export function containerPorts(ports?: V1ContainerPort[]): Component<any> {
  return new ListFactory({
    items: (ports || []).map(p =>
      new TextFactory({
        value: `${p.containerPort}/${p.protocol || 'TCP'}`
      }).toComponent(),
    ),
  }).toComponent();
}

export function environmentList(env: V1EnvVar[] | undefined, namespace: string | undefined, linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string): Component<any> {
  const columns = {
    name: 'Name',
    value: 'Value',
    source: 'Source',
  };
  const table = new h.TableFactoryBuilder([], []);
  table.columns = [
    columns.name,
    columns.value,
    columns.source,
  ];
  table.loading = false;
  table.emptyContent = "There are no environment variables!";

  for (const e of env || []) {
    const row = new h.TableRow(
      {
        [columns.name]: new TextFactory({ value: e.name }),
      },
    );

    if (e.value) {
      row.data[columns.value] = new TextFactory({ value: e.value || "" });
    }
    if (e.valueFrom?.fieldRef) {
      row.data[columns.source] = new TextFactory({ value: e.valueFrom.fieldRef.fieldPath });
    } else if (e.valueFrom?.resourceFieldRef) {
      row.data[columns.source] = new TextFactory({ value: e.valueFrom.resourceFieldRef.resource });
    } else if (e.valueFrom?.secretKeyRef) {
      row.data[columns.source] = new LinkFactory({
        value: `${e.valueFrom.secretKeyRef.name}:${e.valueFrom.secretKeyRef.key}`,
        ref: linker({ apiVersion: "v1", kind: "Secret", namespace, name: e.valueFrom.secretKeyRef.name }),
      });
    } else if (e.valueFrom?.configMapKeyRef) {
      row.data[columns.source] = new LinkFactory({
        value: `${e.valueFrom.configMapKeyRef.name}:${e.valueFrom.configMapKeyRef.key}`,
        ref: linker({ apiVersion: "v1", kind: "ConfigMap", namespace, name: e.valueFrom.configMapKeyRef.name }),
      });
    }

    table.push(row);
  }

  return table.getFactory().toComponent();
}

export function volumeMountList(mounts?: V1VolumeMount[]): Component<any> {
  const columns = {
    name: 'Name',
    mountPath: 'Mount Path',
    propagation: 'Propagation',
  };
  const table = new h.TableFactoryBuilder([], []);
  table.columns = [
    columns.name,
    columns.mountPath,
    columns.propagation,
  ];
  table.loading = false;
  table.emptyContent = "There are no volume mounts!";

  for (const m of mounts || []) {
    const row = new h.TableRow(
      {
        [columns.name]: new TextFactory({ value: m.name }),
        [columns.mountPath]: new TextFactory({ value: `${m.mountPath} (${m.readOnly ? 'ro' : 'rw'})` }),
        [columns.propagation]: new TextFactory({ value: m.mountPropagation || 'None' }),
      },
    );
    table.push(row);
  }

  return table.getFactory().toComponent();
}
