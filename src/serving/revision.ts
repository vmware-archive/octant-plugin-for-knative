/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1PodTemplateSpec } from "@kubernetes/client-node";

// components
import { Component } from "../octant/component";
import { ComponentFactory, FactoryMetadata } from "../octant/component-factory";
import { GridActionsFactory } from "../octant/grid-actions";
import { LinkFactory } from "../octant/link";
import { TableFactory } from '../octant/table';
import { TextFactory } from "../octant/text";
import { TimestampFactory } from "../octant/timestamp";

import { ConditionSummaryFactory, Condition } from "./conditions";
import { deleteGridAction } from "./utils";

// TODO fully fresh out
export interface Revision {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    template: V1PodTemplateSpec;
  };
  status: {
    conditions?: Condition[];
    serviceName?: string;
  };
}

interface RevisionListParameters {
  revisions: Revision[];
  factoryMetadata?: FactoryMetadata;
}

export class RevisionListFactory implements ComponentFactory<any> {
  private readonly revisions: Revision[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ revisions, factoryMetadata }: RevisionListParameters) {
    this.revisions = revisions;
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
          // TODO manage internal links centrally
          ref: `/knative/revisions/${metadata.name}`,
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
