/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// components
import { Component } from "../octant/component";
import { ComponentFactory, FactoryMetadata } from "../octant/component-factory";
import { GridActionsFactory } from "../octant/grid-actions";
import { LinkFactory } from "../octant/link";
import { TableFactory } from '../octant/table';
import { TextFactory } from "../octant/text";
import { TimestampFactory } from "../octant/timestamp";

import { ConditionSummaryFactory, Condition, ConditionStatus } from "./conditions";
import { deleteGridAction } from "./utils";

// TODO fully fresh out
export interface Route {
  apiVersion: string;
  kind: string;
  metadata: {
    namespace: string;
    name: string;
    creationTimestamp: string;
  };
  spec: {};
  status: {
    conditions?: Condition[];
    url?: string;
  };
}

interface RouteListParameters {
  routes: Route[];
  factoryMetadata?: FactoryMetadata;
}

export class RouteListFactory implements ComponentFactory<any> {
  private readonly routes: Route[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ routes, factoryMetadata }: RouteListParameters) {
    this.routes = routes;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    let rows = this.routes.map(route => {
      const { metadata, spec, status } = route;

      const conditions = (status.conditions || []) as Condition[];
      const ready = new ConditionSummaryFactory({ condition: conditions.find(cond => cond.type === "Ready") });

      let notFound = new TextFactory({ value: '<not found>' }).toComponent();

      return {
        '_action': new GridActionsFactory({
          actions: [
            deleteGridAction(route),
          ],
        }).toComponent(),
        'Name': new LinkFactory({
          value: metadata.name,
          // TODO manage internal links centrally
          ref: `/knative/routes/${metadata.name}`,
          options: {
            status: ready.status(),
            statusDetail: ready.toComponent(),
          },
        }).toComponent(),
        'URL': status.url
          ? new LinkFactory({ value: status.url, ref: status.url }).toComponent()
          : notFound,
        'Age': new TimestampFactory({ timestamp: Date.parse(metadata.creationTimestamp) / 1000 }).toComponent(),
      };
    });

    let columns = [
      'Name',
      'URL',
      'Age',
    ].map(name => ({ name, accessor: name }));

    let table = new TableFactory({
      columns,
      rows,
      emptyContent: "There are no routes!",
      loading: false,
      filters: {},
      factoryMetadata: this.factoryMetadata,
    });

    return table.toComponent();
  }
}
