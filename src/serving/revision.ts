/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

// components
import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { ConditionSummaryFactory, ConditionListFactory } from "../components/conditions";
import { DonutChartFactory } from "@project-octant/plugin/components/donut-chart";
import { FlexLayoutFactory } from "@project-octant/plugin/components/flexlayout";
import { GridActionsFactory } from "@project-octant/plugin/components/grid-actions";
import { deleteGridAction } from "../components/grid-actions";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { linker } from "../components/linker";
import { RuntimeObject } from "../components/metadata";
import { containerPorts, environmentList, volumeMountList } from "../components/pod";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { TextFactory } from "@project-octant/plugin/components/text";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";

import { V1Pod, V1ObjectReference, V1Deployment } from "@kubernetes/client-node";
import { ServingV1, ServingV1Revision, ServingV1Route, Revision, Route } from "./api";

interface RevisionListParameters {
  revisions: Revision[];
  latestCreatedRevision?: string;
  latestReadyRevision?: string;
  childDeployments?: {[key: string]: V1Deployment};
  allRoutes?: Route[];
  context: V1ObjectReference;
  linker: linker;
  factoryMetadata?: FactoryMetadata;
}

export class RevisionListFactory implements ComponentFactory<any> {
  private readonly revisions: Revision[];
  private readonly latestCreatedRevision?: string;
  private readonly latestReadyRevision?: string;
  private readonly childDeployments?: {[key: string]: V1Deployment};
  private readonly allRoutes?: Route[];
  private readonly context: V1ObjectReference;
  private readonly linker: linker;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ revisions, latestCreatedRevision, latestReadyRevision, childDeployments, allRoutes, context, linker, factoryMetadata }: RevisionListParameters) {
    this.revisions = revisions;
    this.latestCreatedRevision = latestCreatedRevision;
    this.latestReadyRevision = latestReadyRevision;
    this.childDeployments = childDeployments
    this.allRoutes = allRoutes;
    this.context = context;
    this.linker = linker
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const columns = {
      name: 'Name',
      generation: 'Generation',
      traffic: 'Route Traffic',
      replicas: 'Replicas',
      age: 'Age',
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.name,
      this.allRoutes ? columns.traffic : '',
      this.childDeployments ? columns.replicas : '',
      columns.generation,
      columns.age,
    ].filter(i => i);

    table.loading = false;
    table.emptyContent = "There are no revisions!";
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '*not found*', options: { isMarkdown: true } });
    for (const revision of this.revisions) {
      const { metadata, spec, status } = revision;

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      let pills = "";
      if (revision.metadata.name == this.latestReadyRevision) {
        pills += "<span class='label'>Latest Ready</span>";
      }
      if (revision.metadata.name == this.latestCreatedRevision) {
        pills += "<span class='label'>Latest Created<span>";
      }

      const traffic = (this.allRoutes || []).reduce((traffic, route) => {
        for (const t of (route.status?.traffic || [])) {
          if (t.revisionName == revision.metadata.name) {
            traffic.push(new LinkFactory({
              value: `${route.metadata.name} @ ${t.percent || 0}%`,
              ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Route, name: route.metadata.name }),
            }).toComponent());
          }
        }
        return traffic;
      }, [] as Component<any>[]);
      if (!traffic.length) {
        traffic.push(new TextFactory({ value: "*none*", options: { isMarkdown: true } }).toComponent())
      }

      const row = new h.TableRow(
        {
          [columns.name]: new FlexLayoutFactory({
            options: {
              sections: [
                [
                  {
                    width: pills ? h.Width.Half : h.Width.Full,
                    view: new LinkFactory({
                      value: metadata.name || '',
                      ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: metadata.name }, this.context),
                      options: {
                        status: ready.statusCode(),
                        statusDetail: ready.toComponent(),
                      },
                    }).toComponent(),
                  },
                  pills ? {
                    width: h.Width.Half,
                    view: new TextFactory({ value: pills, options: { isMarkdown: true } }).toComponent(),
                  } : undefined,
                ].filter(i => i) as { width: number, view: Component<any> }[],
              ],
            },
          }),
          [columns.generation]: (metadata.labels || {})['serving.knative.dev/configurationGeneration']
            ? new TextFactory({ value: (metadata.labels || {})['serving.knative.dev/configurationGeneration'] })
            : notFound,
          [columns.traffic]: new FlexLayoutFactory({
            options: {
              sections: [
                traffic.map(t => {
                  return { width: h.Width.Full, view: t };
                })
              ],
            },
          }),
          [columns.age]: new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) }),
        },
        {
          isDeleting: !!metadata?.deletionTimestamp,
          gridActions: new GridActionsFactory({
            actions: [
              deleteGridAction(revision),
            ]
          })
        }
      );

      if (this.childDeployments && revision.metadata.uid && this.childDeployments[revision.metadata.uid]) {
        const d = this.childDeployments[revision.metadata.uid];
        const available = d.status?.availableReplicas || 0;
        const total = available + (d.status?.unavailableReplicas || 0);
        row.data[columns.replicas] = new TextFactory({ value: `${available}/${total}` });
      } else {
        row.data[columns.replicas] = new TextFactory({ value: "unknown" });
      }

      table.push(row);   
    }

    return table.getFactory().toComponent();
  }
}

interface RevisionDetailParameters {
  revision: Revision;
  childDeployment?: V1Deployment;
  pods: V1Pod[];
  linker: linker;
  factoryMetadata?: FactoryMetadata;
}

export class RevisionSummaryFactory implements ComponentFactory<any> {
  private readonly revision: Revision;
  private readonly childDeployment?: V1Deployment;
  private readonly pods: V1Pod[];
  private readonly linker: linker;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ revision, childDeployment, pods, linker, factoryMetadata }: RevisionDetailParameters) {
    this.revision = revision;
    this.childDeployment = childDeployment;
    this.pods = pods;
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
            { view: this.toPodChartComponent(), width: h.Width.Full / 4 },
            { view: this.toPodListComponent(), width: h.Width.Full * 3 / 4 },
          ],
        ],
      },
      factoryMetadata: this.factoryMetadata,
    });
    return layout.toComponent();
  }

  toSpecComponent(): Component<any> {
    const { metadata, spec } = this.revision;
    const container = spec.containers[0];

    const sections = [
      { header: "Image", content: container?.image ?
        new TextFactory({ value: container.image }).toComponent() :
        new TextFactory({ value: '*empty*', options: { isMarkdown: true } }).toComponent() },
    ];
    if (container?.ports?.length) {
      sections.push({ header: "Container Ports", content: containerPorts(container?.ports) });
    }
    if (container?.env?.length) {
      sections.push({ header: "Environment", content: environmentList(container?.env, metadata.namespace, this.linker) });
    }
    if (container?.volumeMounts?.length) {
      sections.push({ header: "Volume Mounts", content: volumeMountList(container?.volumeMounts) });
    }

    const summary = new SummaryFactory({
      sections,
      factoryMetadata: {
        title: [new TextFactory({ value: "Spec" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toStatusComponent(): Component<any> {
    const { status } = this.revision;
    const summary = new SummaryFactory({
      sections: [
        {
          header: "Image",
          content: status.imageDigest ?
            new TextFactory({ value: status.imageDigest }).toComponent() :
            new TextFactory({ value: '*unknown*', options: { isMarkdown: true } }).toComponent(),
        },
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
      conditions: this.revision.status.conditions || [],
      factoryMetadata: {
        title: [new TextFactory({ value: "Conditions" }).toComponent()],
      },
    }).toComponent();
  }

  toPodChartComponent(): Component<any> {
    const segments = [
      {
        count: this.childDeployment?.status?.availableReplicas || 0,
        status: "ok",
      }
    ];
    if (this.childDeployment?.status?.unavailableReplicas) {
      // avoid a 1px orange line rendering glitch by only including when there is data to render
      segments.push({
        count: this.childDeployment.status.unavailableReplicas,
        status: "warning",
      });
    }

    return new DonutChartFactory({
      labels: {
        singular: "Pod",
        plural: "Pods",
      },
      segments,
      size: 100,
    }).toComponent();
  }

  toPodListComponent(): Component<any> {
    return new PodListFactory({
      pods: this.pods,
      factoryMetadata: {
        title: [new TextFactory({ value: 'Pods' }).toComponent()],
      },
    }).toComponent();
  }

}

interface PodListParameters {
  pods: V1Pod[];
  factoryMetadata?: FactoryMetadata;
}

export class PodListFactory implements ComponentFactory<any> {
  private readonly pods: V1Pod[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ pods, factoryMetadata }: PodListParameters) {
    this.pods = pods;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const columns = {
      name: 'Name',
      age: 'Age',
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.name,
      columns.age,
    ];
    table.loading = false;
    table.emptyContent = "There are no pods!";
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '*not found*', options: { isMarkdown: true } });
    for (const pod of this.pods) {
      const { metadata, spec, status } = pod;

      let readyStatus = 2;
      if (status?.phase === "Running") {
        readyStatus = 1;
      } else if (status?.phase === "Unknown") {
        readyStatus = 3;
      }
      const readyStatusDetail = new TextFactory({ value: status?.message || "Unknown" }).toComponent();

      const row = new h.TableRow(
        {
          [columns.name]: new LinkFactory({
            value: metadata?.name || '',
            ref: `/overview/namespace/${metadata?.namespace}/workloads/pods/${metadata?.name}`,
            options: {
              status: readyStatus,
              statusDetail: readyStatusDetail,
            },
          }),
          [columns.age]: new TimestampFactory({ timestamp: Math.floor(new Date(metadata?.creationTimestamp || 0).getTime() / 1000) }),
          },
        {
          isDeleting: !!metadata?.deletionTimestamp,
          gridActions: new GridActionsFactory({
            actions: [
              deleteGridAction(pod as RuntimeObject),
            ]
          }),
        }
      );    
      table.push(row);
    }

    return table.getFactory().toComponent();
  }
}
