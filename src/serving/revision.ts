/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1PodSpec, V1Pod, V1ObjectReference } from "@kubernetes/client-node";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

// components
import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { FlexLayoutFactory } from "@project-octant/plugin/components/flexlayout";
import { GridActionsFactory } from "@project-octant/plugin/components/grid-actions";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { TextFactory } from "@project-octant/plugin/components/text";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";

import { ConditionSummaryFactory, ConditionStatusFactory, Condition } from "./conditions";
import { deleteGridAction, ServingV1, ServingV1Revision } from "../utils";
import { RuntimeObject } from "../metadata";

// TODO fully fresh out
export interface Revision {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: V1PodSpec;
  status: {
    conditions?: Condition[];
    serviceName?: string;
    imageDigest?: string;
  };
}

interface RevisionListParameters {
  revisions: Revision[];
  context: V1ObjectReference;
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class RevisionListFactory implements ComponentFactory<any> {
  private readonly revisions: Revision[];
  private readonly context: V1ObjectReference;
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ revisions, context, linker, factoryMetadata }: RevisionListParameters) {
    this.revisions = revisions;
    this.context = context;
    this.linker = linker
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const columns = {
      name: 'Name',
      generation: 'Generation',
      age: 'Age',
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.name,
      columns.generation,
      columns.age,
    ];
    table.loading = false;
    table.emptyContent = "There are no revisions!";
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '<not found>' });
    for (const revision of this.revisions) {
      const { metadata, spec, status } = revision;

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      const row = new h.TableRow(
        {
          [columns.name]: new LinkFactory({
            value: metadata.name || '',
            ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: metadata.name }, this.context),
            options: {
              status: ready.statusCode(),
              statusDetail: ready.toComponent(),
            },
          }),
          [columns.generation]: (metadata.labels || {})['serving.knative.dev/configurationGeneration']
            ? new TextFactory({ value: (metadata.labels || {})['serving.knative.dev/configurationGeneration'] })
            : notFound,
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
      table.push(row);   
    }

    return table.getFactory().toComponent();
  }
}

interface RevisionDetailParameters {
  revision: Revision;
  pods: V1Pod[];
  factoryMetadata?: FactoryMetadata;
}

export class RevisionSummaryFactory implements ComponentFactory<any> {
  private readonly revision: Revision;
  private readonly pods: V1Pod[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ revision, pods, factoryMetadata }: RevisionDetailParameters) {
    this.revision = revision;
    this.pods = pods;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const layout = new FlexLayoutFactory({
      options: {
        sections: [
          [
            { view: this.toSpecComponent(), width: h.Width.Half },
            { view: this.toStatusComponent(), width: h.Width.Half },
            { view: this.toPodListComponent(), width: h.Width.Full },
          ],
        ],
      },
      factoryMetadata: this.factoryMetadata,
    });
    return layout.toComponent();
  }

  toSpecComponent(): Component<any> {
    const { metadata, spec } = this.revision;

    const summary = new SummaryFactory({
      sections: [
        { header: "Image", content: new TextFactory({ value: spec.containers[0].image || '<not found>' }).toComponent() },
      ],
      factoryMetadata: {
        title: [new TextFactory({ value: "Spec" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toStatusComponent(): Component<any> {
    const { status } = this.revision;

    let unknown = new TextFactory({ value: '<unknown>' }).toComponent();

    const summary = new SummaryFactory({
      sections: [
        { header: "Ready", content: new ConditionStatusFactory({ conditions: status.conditions, type: "Ready" }).toComponent() },
        { header: "Active", content: new ConditionStatusFactory({ conditions: status.conditions, type: "Active" }).toComponent() },
        { header: "Container Healthy", content: new ConditionStatusFactory({ conditions: status.conditions, type: "ContainerHealthy" }).toComponent() },
        { header: "Resources Available", content: new ConditionStatusFactory({ conditions: status.conditions, type: "ResourcesAvailable" }).toComponent() },
        { header: "Image", content: status.imageDigest ? new TextFactory({ value: status.imageDigest }).toComponent() : unknown },
      ],
      factoryMetadata: {
        title: [new TextFactory({ value: "Status" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toPodListComponent(): Component<any> {
    return new PodListFactory({
      pods: this.pods,
      factoryMetadata: {
        title: [new TextFactory({ value: "Pods" }).toComponent()],
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

    const notFound = new TextFactory({ value: '<not found>' });
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
