/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1ObjectReference } from "@kubernetes/client-node";

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

import { ConditionSummaryFactory, ConditionStatusFactory, Condition } from "./conditions";
import { deleteGridAction, ServingV1, ServingV1Configuration, ServingV1Route, ServingV1Revision } from "../utils";
import { DashboardClient } from "../octant/plugin";
import { ResourceViewerConfig } from "../octant/resource-viewer";
import { KnativeResourceViewerFactory, Edge, Node } from "./resource-viewer";
import { Configuration } from "./configuration";
import { Revision } from "./revision";

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
    address: {
      url?: string;
    };
    url?: string;
    traffic: TrafficPolicy[];
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
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class RouteListFactory implements ComponentFactory<any> {
  private readonly routes: Route[];
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ routes, linker, factoryMetadata }: RouteListParameters) {
    this.routes = routes;
    this.linker = linker;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    let rows = this.routes.map(route => {
      const { metadata, spec, status } = route;

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      let notFound = new TextFactory({ value: '<not found>' }).toComponent();

      const row = {
        '_action': new GridActionsFactory({
          actions: [
            deleteGridAction(route),
          ],
        }).toComponent(),
        'Name': new LinkFactory({
          value: metadata.name || '',
          ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Route, name: metadata.name }),
          options: {
            status: ready.statusCode(),
            statusDetail: ready.toComponent(),
          },
        }).toComponent(),
        'URL': status.url
          ? new LinkFactory({ value: status.url, ref: status.url }).toComponent()
          : notFound,
        'Age': new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) }).toComponent(),
      } as { [key: string]: Component<any> };

      if (metadata?.deletionTimestamp) {
        row['_isDeleted'] = new TextFactory({ value: "deleted" }).toComponent();
      }

      return row;
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
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class RouteSummaryFactory implements ComponentFactory<any> {
  private readonly route: Route;
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ route, linker, factoryMetadata }: RouteDetailParameters) {
    this.route = route;
    this.linker = linker;
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
    return new TrafficPolicyTableFactory({ trafficPolicy: this.route.spec.traffic, linker: this.linker }).toComponent();
  }

  toStatusComponent(): Component<any> {
    const { status } = this.route;

    let unknown = new TextFactory({ value: '<unknown>' }).toComponent();

    const summary = new SummaryFactory({
      sections: [
        { header: "Ready", content: new ConditionStatusFactory({ conditions: status.conditions, type: "Ready" }).toComponent() },
        { header: "Address", content: status.address?.url ? new LinkFactory({ value: status.address?.url, ref: status.address?.url }).toComponent() : unknown },
        { header: "URL", content: status.url ? new LinkFactory({ value: status.url, ref: status.url }).toComponent() : unknown },
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
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
}

export class TrafficPolicyTableFactory implements ComponentFactory<any> {
  private readonly trafficPolicy: TrafficPolicy[];
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;

  constructor({ trafficPolicy, linker }: TrafficPolicyTableParameters) {
    this.trafficPolicy = trafficPolicy;
    this.linker = linker;
  }
  
  toComponent(): Component<any> {
    let rows = this.trafficPolicy.map(tp => {

      let type = 'Latest Revision';
      let name: ComponentFactory<any> = new TextFactory({ value: 'n/a' });
      if (tp.configurationName) {
        type = ServingV1Configuration;
        name = new LinkFactory({
          value: tp.configurationName,
          ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Configuration, name: tp.configurationName }),
        });
      } else if (tp.revisionName) {
        type = ServingV1Revision;
        name = new LinkFactory({
          value: tp.revisionName,
          // TODO lookup the configuration for this revision
          ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: tp.revisionName }, { apiVersion: ServingV1, kind: ServingV1Configuration, name: "_" }),
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

interface RouteDataPlaneViewerConfig {
  route: Route;
  dashboardClient: DashboardClient;
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class RouteDataPlaneViewerFactory implements ComponentFactory<ResourceViewerConfig> {
  private readonly route: Route;
  private readonly dashboardClient: DashboardClient;
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  private readonly nodes: {[key: string]: Node};
  private readonly edges: {[key: string]: Edge[]};

  constructor({ route, dashboardClient, linker, factoryMetadata }: RouteDataPlaneViewerConfig) {
    this.route = route;
    this.dashboardClient = dashboardClient;
    this.linker = linker;
    this.factoryMetadata = factoryMetadata;

    this.nodes = {};
    this.edges = {};
  }

  toComponent(): Component<ResourceViewerConfig> {
    const rv = new KnativeResourceViewerFactory({ self: this.route, linker: this.linker, factoryMetadata: this.factoryMetadata });

    // add service
    rv.addNode(this.route);

    const trafficPolicy = this.route.status.traffic.slice();
    trafficPolicy.sort((a, b) => a.percent - b.percent);
    for (const traffic of this.route.status.traffic) {
      if (!traffic.percent) {
        continue;
      }

      if (traffic.configurationName) {
        try {
          const configuration: Configuration = this.dashboardClient.Get({
            apiVersion: ServingV1,
            kind: ServingV1Configuration,
            namespace: this.route.metadata.namespace,
            name: traffic.configurationName,
          });
          rv.addEdge(this.route, configuration, "explicit");
          const revision: Revision = this.dashboardClient.Get({
            apiVersion: ServingV1,
            kind: ServingV1Revision,
            namespace: this.route.metadata.namespace,
            name: configuration.status.latestCreatedRevisionName,
          });
          rv.addEdge(configuration, revision, "implicit");
        } catch (e) {
          // TODO handle notfound vs other errors
        }
      } else if (traffic.revisionName) {
        try {
          const revision: Revision = this.dashboardClient.Get({
            apiVersion: ServingV1,
            kind: ServingV1Revision,
            namespace: this.route.metadata.namespace,
            name: traffic.revisionName,
          });
          rv.addEdge(this.route, revision, "explicit");
        } catch (e) {
          // TODO handle notfound vs other errors
        }
      }
    }
    
    return rv.toComponent();
  }
}
