/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta } from "@kubernetes/client-node";

// components
import { Component } from "../octant/component";
import { ComponentFactory, FactoryMetadata } from "../octant/component-factory";
import { FlexLayoutFactory } from "../octant/flexlayout";
import { GridActionsFactory } from "../octant/grid-actions";
import { LinkFactory } from "../octant/link";
import { SummaryFactory } from "../octant/summary";
import { TableFactory } from '../octant/table';
import { TextFactory } from "../octant/text";
import { TimestampFactory } from "../octant/timestamp";

import { ConditionSummaryFactory, Condition, ConditionStatus } from "./conditions";
import { deleteGridAction } from "./utils";

// TODO fully fresh out
export interface Route {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    traffic: TrafficPolicy[];
  };
  status: {
    conditions?: Condition[];
    url?: string;
  };
}

export interface TrafficPolicy {
  configurationName?: string;
  revisionName?: string;
  latestRevision: boolean;
  percent: number;
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
          value: metadata.name || '',
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
        'Age': new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) }).toComponent(),
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

interface RouteDetailParameters {
  route: Route;
  factoryMetadata?: FactoryMetadata;
}

export class RouteSummaryFactory implements ComponentFactory<any> {
  private readonly route: Route;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ route, factoryMetadata }: RouteDetailParameters) {
    this.route = route;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const layout = new FlexLayoutFactory({
      options: {
        sections: [
          [
            { view: this.toSpecComponent(), width: 12 },
            { view: this.toStatusComponent(), width: 12 },
          ],
        ],
      },
      factoryMetadata: this.factoryMetadata,
    });
    return layout.toComponent();
  }

  toSpecComponent(): Component<any> {
    return new TrafficPolicyTableFactory({ trafficPolicy: this.route.spec.traffic }).toComponent();
  }

  toStatusComponent(): Component<any> {
    const { status } = this.route;

    const conditions = (status.conditions || []) as Condition[];
    const ready = conditions.find(cond => cond.type === "Ready");

    const summary = new SummaryFactory({
      sections: [
        { header: "Ready", content: new TextFactory({ value: ready?.status || ConditionStatus.Unknown }).toComponent() },
      ],
      factoryMetadata: {
        title: [new TextFactory({ value: "Status" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

}

interface TrafficPolicyTableParameters {
  trafficPolicy: TrafficPolicy[];
}

export class TrafficPolicyTableFactory implements ComponentFactory<any> {
  private readonly trafficPolicy: TrafficPolicy[];

  constructor({ trafficPolicy }: TrafficPolicyTableParameters) {
    this.trafficPolicy = trafficPolicy;
  }
  
  toComponent(): Component<any> {
    let rows = this.trafficPolicy.map(tp => {

      let type = 'Latest Revision';
      let name: ComponentFactory<any> = new TextFactory({ value: 'n/a' });
      if (tp.configurationName) {
        type = 'Configuration';
        name = new LinkFactory({
          value: tp.configurationName,
          // TODO manage internal links centrally
          ref: `/knative/configurations/${tp.configurationName}`,
        });
      } else if (tp.revisionName) {
        type = 'Revision';
        name = new LinkFactory({
          value: tp.revisionName,
          // TODO manage internal links centrally
          // TODO lookup the configuration for this revision
          ref: `/knative/configurations/_/revisions/${tp.revisionName}`,
        });
      }

      return {
        'Name': name.toComponent(),
        'Type': new TextFactory({ value: type }).toComponent(),
        'Percent': new TextFactory({ value: `${tp.percent}%` }).toComponent(),
      };
    });

    let columns = [
      'Name',
      'Type',
      'Percent',
    ].map(name => ({ name, accessor: name }));

    let table = new TableFactory({
      columns,
      rows,
      emptyContent: "There are no traffic rules!",
      loading: false,
      filters: {},
      factoryMetadata: {
        title: [new TextFactory({ value: "Traffic Policy" }).toComponent()],
      },
    });

    return table.toComponent();
  }
}
