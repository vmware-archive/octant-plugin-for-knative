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
export interface Configuration {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    template: V1PodTemplateSpec;
  };
  status: {
    conditions?: Condition[];
    latestCreatedRevisionName?: string;
    latestReadyRevisionName?: string;
  };
}

interface ConfigurationListParameters {
  configurations: Configuration[];
  factoryMetadata?: FactoryMetadata;
}

export class ConfigurationListFactory implements ComponentFactory<any> {
  private readonly configurations: Configuration[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ configurations, factoryMetadata }: ConfigurationListParameters) {
    this.configurations = configurations;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    let rows = this.configurations.map(configuration => {
      const { metadata, spec, status } = configuration;

      const conditions = (status.conditions || []) as Condition[];
      const ready = new ConditionSummaryFactory({ condition: conditions.find(cond => cond.type === "Ready") });

      let notFound = new TextFactory({ value: '<not found>' }).toComponent();

      return {
        '_action': new GridActionsFactory({
          actions: [
            deleteGridAction(configuration),
          ],
        }).toComponent(),
        'Name': new LinkFactory({
          value: metadata.name || '',
          // TODO manage internal links centrally
          ref: `/knative/configurations/${metadata.name}`,
          options: {
            status: ready.status(),
            statusDetail: ready.toComponent(),
          },
        }).toComponent(),
        'Latest Created': status.latestCreatedRevisionName
          ? new TextFactory({ value: status.latestCreatedRevisionName }).toComponent()
          : notFound,
        'Latest Ready': status.latestReadyRevisionName
          ? new TextFactory({ value: status.latestReadyRevisionName }).toComponent()
          : notFound,
        'Age': new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) }).toComponent(),
      };
    });

    let columns = [
      'Name',
      'Latest Created',
      'Latest Ready',
      'Age',
    ].map(name => ({ name, accessor: name }));

    let table = new TableFactory({
      columns,
      rows,
      emptyContent: "There are no configurations!",
      loading: false,
      filters: {},
      factoryMetadata: this.factoryMetadata,
    });

    return table.toComponent();
  }
}
