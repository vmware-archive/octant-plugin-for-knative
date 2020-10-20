/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as octant from "@project-octant/plugin";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

// components
import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { FlexLayoutFactory } from "@project-octant/plugin/components/flexlayout";
import { GridActionsFactory } from "@project-octant/plugin/components/grid-actions";
import { deleteGridAction } from "../components/grid-actions";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { linker } from "../components/linker";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { TextFactory } from "@project-octant/plugin/components/text";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";

import { ConditionSummaryFactory, ConditionListFactory } from "../components/conditions";
import { KnativeResourceViewerFactory, ResourceViewerConfig, Edge, Node } from "../components/resource-viewer";

import { V1ObjectReference } from "@kubernetes/client-node";
import { ServingV1, ServingV1Configuration, ServingV1Route, ServingV1Revision, Configuration, Revision, Route, TrafficPolicy } from "./api";

interface RouteListParameters {
  routes: Route[];
  linker: linker;
  factoryMetadata?: FactoryMetadata;
}

export class RouteListFactory implements ComponentFactory<any> {
  private readonly routes: Route[];
  private readonly linker: linker;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ routes, linker, factoryMetadata }: RouteListParameters) {
    this.routes = routes;
    this.linker = linker;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const columns = {
      name: 'Name',
      url: 'URL',
      age: 'Age',
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.name,
      columns.url,
      columns.age,
    ];
    table.loading = false;
    table.emptyContent = "There are no routes!";
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '*not found*', options: { isMarkdown: true } });
    for (const route of this.routes) {
      const { metadata, spec, status } = route;

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      const row = new h.TableRow(
        {
          [columns.name]: new LinkFactory({
            value: metadata.name || '',
            ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Route, name: metadata.name }),
            options: {
              status: ready.statusCode(),
              statusDetail: ready.toComponent(),
            },
          }),
          [columns.url]: status.url
            ? new LinkFactory({ value: status.url, ref: status.url })
            : notFound,
          [columns.age]: new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) }),
        },
        {
          isDeleting: !!metadata?.deletionTimestamp,
          gridActions: new GridActionsFactory({
            actions: [
              deleteGridAction(route),
            ]
          }),
        }
      );    
      table.push(row);   
    }

    return table.getFactory().toComponent();
  }
}

interface RouteDetailParameters {
  route: Route;
  linker: linker;
  factoryMetadata?: FactoryMetadata;
}

export class RouteSummaryFactory implements ComponentFactory<any> {
  private readonly route: Route;
  private readonly linker: linker;
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
            { view: this.toSpecComponent(), width: h.Width.Full },
            { view: this.toStatusComponent(), width: h.Width.Full },
          ],
        ],
      },
      factoryMetadata: this.factoryMetadata,
    });
    return layout.toComponent();
  }

  toSpecComponent(): Component<any> {
    const summary = new SummaryFactory({
      sections: [
        { header: "Traffic Policy", content: new TrafficPolicyTableFactory({ trafficPolicy: this.route.spec.traffic, trafficPolicyStatus: this.route.status.traffic, linker: this.linker }).toComponent() },
      ],
      factoryMetadata: {
        title: [new TextFactory({ value: "Spec" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toStatusComponent(): Component<any> {
    const { status } = this.route;

    let unknown = new TextFactory({ value: '*unknown*', options: { isMarkdown: true } }).toComponent();

    const summary = new SummaryFactory({
      sections: [
        { header: "External Address", content: status.url ? new LinkFactory({ value: status.url, ref: status.url }).toComponent() : unknown },
        { header: "Internal Address", content: status.address?.url ? new LinkFactory({ value: status.address?.url, ref: status.address?.url }).toComponent() : unknown },
        { header: "Conditions", content: this.toConditionsListComponent() },
      ],
      factoryMetadata: {
        title: [new TextFactory({ value: "Status" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toConditionsListComponent(): Component<any> {
    return new ConditionListFactory({
      conditions: this.route.status.conditions || [],
      factoryMetadata: {
        title: [new TextFactory({ value: "Conditions" }).toComponent()],
      },
    }).toComponent();
  }

}

interface TrafficPolicyTableParameters {
  trafficPolicy: TrafficPolicy[];
  trafficPolicyStatus?: TrafficPolicy[];
  latestRevision?: string;
  linkerContext?: V1ObjectReference;
  linker: linker;
}

export class TrafficPolicyTableFactory implements ComponentFactory<any> {
  private readonly trafficPolicy: TrafficPolicy[];
  private readonly trafficPolicyStatus?: TrafficPolicy[];
  private readonly latestRevision?: string;
  private readonly linkerContext?: V1ObjectReference;
  private readonly linker: linker;

  constructor({ trafficPolicy, trafficPolicyStatus, latestRevision, linkerContext, linker }: TrafficPolicyTableParameters) {
    this.trafficPolicy = trafficPolicy;
    this.trafficPolicyStatus = trafficPolicyStatus;
    this.latestRevision = latestRevision;
    this.linkerContext = linkerContext;
    this.linker = linker;
  }
  
  toComponent(): Component<any> {
    const columns = {
      name: 'Name',
      type: 'Type',
      percent: 'Percent',
      tag: 'Tag',
    };
    const table = new h.TableFactoryBuilder([], []);
    table.title = [new TextFactory({ value: "Traffic Policy" })];
    table.columns = [
      columns.name,
      columns.type,
      columns.percent,
      columns.tag,
    ];
    table.loading = false;
    table.emptyContent = "There are no traffic rules!";

    for (const tp of this.trafficPolicy) {
      let type = 'Latest Revision';
      let name: ComponentFactory<any> = new TextFactory({ value: '*unknown*', options: { isMarkdown: true } });
      if (tp.latestRevision && this.latestRevision) {
        name = new LinkFactory({
          value: this.latestRevision,
          ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: this.latestRevision }, this.linkerContext || { apiVersion: ServingV1, kind: ServingV1Configuration, name: "_" }),
        });
      } else if (tp.configurationName) {
        type = ServingV1Configuration;
        name = new LinkFactory({
          value: tp.configurationName,
          ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Configuration, name: tp.configurationName }, this.linkerContext),
        });
      } else if (tp.revisionName) {
        type = ServingV1Revision;
        name = new LinkFactory({
          value: tp.revisionName,
          ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: tp.revisionName }, this.linkerContext || { apiVersion: ServingV1, kind: ServingV1Configuration, name: "_" }),
        });
      }
      const tpUrl = tp.url || this.trafficPolicyStatus?.find(tps => tp.tag == tps.tag)?.url;
      const row = new h.TableRow(
        {
          [columns.name]: name,
          [columns.type]: new TextFactory({ value: type }),
          [columns.percent]: new TextFactory({ value: `${tp.percent}%` }),
          [columns.tag]: tp.tag ?
            tpUrl ?
              new LinkFactory({ value: tp.tag, ref: tpUrl }) :
              new TextFactory({ value: tp.tag }) :
            new TextFactory({ value: "*none*", options: { isMarkdown: true } }) ,
        },
      );    
      table.push(row);
    }

    return table.getFactory().toComponent();
  }
}

interface RouteDataPlaneViewerConfig {
  route: Route;
  dashboardClient: octant.DashboardClient;
  linker: linker;
  factoryMetadata?: FactoryMetadata;
}

export class RouteDataPlaneViewerFactory implements ComponentFactory<ResourceViewerConfig> {
  private readonly route: Route;
  private readonly dashboardClient: octant.DashboardClient;
  private readonly linker: linker;
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

    if (!this.route.status.traffic) {
      return rv.toComponent();
    }

    const trafficPolicy = this.route.status.traffic.slice();
    trafficPolicy.sort((a, b) => (a.percent || 0) - (b.percent || 0));
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
