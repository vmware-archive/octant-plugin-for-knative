/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1PodSpec, V1Pod, V1ObjectReference } from "@kubernetes/client-node";

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

import { ConditionSummaryFactory, ConditionStatusFactory, Condition } from "../conditions";
import { deleteGridAction, ServingV1, ServingV1Revision } from "../utils";

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
    let rows = this.revisions.map(revision => {
      const { metadata, spec, status } = revision;
      
      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      let notFound = new TextFactory({ value: '<not found>' }).toComponent();

      const row = {
        '_action': new GridActionsFactory({
          actions: [
            deleteGridAction(revision),
          ],
        }).toComponent(),
        'Name': new LinkFactory({
          value: metadata.name || '',
          ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: metadata.name }, this.context),
          options: {
            status: ready.status(),
            statusDetail: ready.toComponent(),
          },
        }).toComponent(),
        'Generation': (metadata.labels || {})['serving.knative.dev/configurationGeneration']
          ? new TextFactory({ value: (metadata.labels || {})['serving.knative.dev/configurationGeneration'] }).toComponent()
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
      'Generation',
      'Age',
    ].map(name => ({ name, accessor: name }));

    let table = new TableFactory({
      columns,
      rows,
      emptyContent: "There are no revisions!",
      loading: false,
      filters: {},
      factoryMetadata: this.factoryMetadata,
    });

    return table.toComponent();
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
            { view: this.toSpecComponent(), width: 12 },
            { view: this.toStatusComponent(), width: 12 },
            { view: this.toPodListComponent(), width: 24 },
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
    let rows = this.pods.map(pod => {
      const { metadata, spec, status } = pod;
      
      let readyStatus = 2;
      if (status?.phase === "Running") {
        readyStatus = 1;
      } else if (status?.phase === "Unknown") {
        readyStatus = 3;
      }
      const readyStatusDetail = new TextFactory({ value: status?.message || "Unknown" }).toComponent();

      const row = {
        '_action': new GridActionsFactory({
          actions: [
            deleteGridAction(pod),
          ],
        }).toComponent(),
        'Name': new LinkFactory({
          value: metadata?.name || '',
          ref: `/overview/namespace/${metadata?.namespace}/workloads/pods/${metadata?.name}`,
          options: {
            status: readyStatus,
            statusDetail: readyStatusDetail,
          },
        }).toComponent(),
        'Age': new TimestampFactory({ timestamp: Math.floor(new Date(metadata?.creationTimestamp || 0).getTime() / 1000) }).toComponent(),
      } as { [key: string]: Component<any> };

      if (metadata?.deletionTimestamp) {
        row['_isDeleted'] = new TextFactory({ value: "deleted" }).toComponent();
      }

      return row;
    });

    let columns = [
      'Name',
      'Age',
    ].map(name => ({ name, accessor: name }));

    let table = new TableFactory({
      columns,
      rows,
      emptyContent: "There are no pods!",
      loading: false,
      filters: {},
      factoryMetadata: this.factoryMetadata,
    });

    return table.toComponent();
  }
}
