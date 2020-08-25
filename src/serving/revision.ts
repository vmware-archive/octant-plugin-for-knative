/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1PodSpec, V1Pod } from "@kubernetes/client-node";

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
export interface Revision {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: V1PodSpec;
  status: {
    conditions?: Condition[];
    serviceName?: string;
  };
}

interface RevisionListParameters {
  revisions: Revision[];
  baseHref: string;
  factoryMetadata?: FactoryMetadata;
}

export class RevisionListFactory implements ComponentFactory<any> {
  private readonly revisions: Revision[];
  private readonly baseHref: string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ revisions, baseHref, factoryMetadata }: RevisionListParameters) {
    this.revisions = revisions;
    this.baseHref = baseHref;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    let rows = this.revisions.map(revision => {
      const { metadata, spec, status } = revision;
      
      const conditions = (status.conditions || []) as Condition[];
      const ready = new ConditionSummaryFactory({ condition: conditions.find(cond => cond.type === "Ready") });

      let notFound = new TextFactory({ value: '<not found>' }).toComponent();

      return {
        '_action': new GridActionsFactory({
          actions: [
            deleteGridAction(revision),
          ],
        }).toComponent(),
        'Name': new LinkFactory({
          value: metadata.name || '',
          ref: `${this.baseHref}/revisions/${metadata.name}`,
          options: {
            status: ready.status(),
            statusDetail: ready.toComponent(),
          },
        }).toComponent(),
        'Config Name': (metadata.labels || {})['serving.knative.dev/configuration']
          ? new TextFactory({ value: (metadata.labels || {})['serving.knative.dev/configuration'] }).toComponent()
          : notFound,
        'K8s Service Name': status.serviceName
          ? new TextFactory({ value: status.serviceName }).toComponent()
          : notFound,
        'Generation': (metadata.labels || {})['serving.knative.dev/configurationGeneration']
          ? new TextFactory({ value: (metadata.labels || {})['serving.knative.dev/configurationGeneration'] }).toComponent()
          : notFound,
        'Age': new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) }).toComponent(),
      };
    });

    let columns = [
      'Name',
      'Config Name',
      'K8s Service Name',
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

      return {
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
      };
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
