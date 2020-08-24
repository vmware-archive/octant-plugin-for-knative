/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// components
import { Component } from "../octant/component";
import { ComponentFactory, FactoryMetadata } from "../octant/component-factory";
import { TableFactory } from '../octant/table';
import { TextFactory } from "../octant/text";
import { TimestampFactory } from "../octant/timestamp";

import { ConditionSummaryFactory, Condition } from "./conditions";

// TODO fully fresh out
export interface Revision {
  apiVersion: string;
  kind: string;
  metadata: {
    namespace: string;
    name: string;
    creationTimestamp: string;
    labels: { [key: string]: string };
  };
  spec: {};
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
    let rows = this.revisions.map(revisions => {
      const { metadata, spec, status } = revisions;
      
      const conditions = (status.conditions || []) as Condition[];
      const ready = new ConditionSummaryFactory({ condition: conditions.find(cond => cond.type === "Ready") });

      let notFound = new TextFactory({ value: '<not found>' }).toComponent();

      return {
        'Name': new TextFactory({
          value: metadata.name,
          // TODO manage internal links centrally
          // ref: `/knative/revisions/${metadata.name}`,
          options: {
            status: ready.status(),
            // TODO the plugin host is unable to unmarshal this field 
            // statusDetail: ready.toComponent(),
          },
        }).toComponent(),
        'Config Name': metadata.labels['serving.knative.dev/configuration']
          ? new TextFactory({ value: metadata.labels['serving.knative.dev/configuration'] }).toComponent()
          : notFound,
        'K8s Service Name': status.serviceName
          ? new TextFactory({ value: status.serviceName }).toComponent()
          : notFound,
        'Generation': metadata.labels['serving.knative.dev/configurationGeneration']
          ? new TextFactory({ value: metadata.labels['serving.knative.dev/configurationGeneration'] }).toComponent()
          : notFound,
        'Age': new TimestampFactory({ timestamp: Date.parse(metadata.creationTimestamp) / 1000 }).toComponent(),
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
