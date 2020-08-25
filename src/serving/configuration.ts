/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1PodTemplateSpec } from "@kubernetes/client-node";
import YAML from "yaml";

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
import { RevisionListFactory, Revision } from "./revision";
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

interface ConfigurationDetailParameters {
  configuration: Configuration;
  revisions: Revision[];
  factoryMetadata?: FactoryMetadata;
}

export class ConfigurationSummaryFactory implements ComponentFactory<any> {
  private readonly configuration: Configuration;
  private readonly revisions: Revision[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ configuration, revisions, factoryMetadata }: ConfigurationDetailParameters) {
    this.configuration = configuration;
    this.revisions = revisions;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const layout = new FlexLayoutFactory({
      options: {
        sections: [
          [
            { view: this.toSpecComponent(), width: 12 },
            { view: this.toStatusComponent(), width: 12 },
            { view: this.toRevisionListComponent(), width: 24 },
          ],
        ],
      },
      factoryMetadata: this.factoryMetadata,
    });
    return layout.toComponent();
  }

  toSpecComponent(): Component<any> {
    const { metadata, spec } = this.configuration;

    const summary = new SummaryFactory({
      sections: [
        { header: "Image", content: new TextFactory({ value: spec.template.spec?.containers[0].image || '<not found>' }).toComponent() },
      ],
      options: {
        actions: [
          {
            name: "Edit",
            title: "Edit Configuration",
            form: {
              fields: [
                {
                  type: "hidden",
                  name: "action",
                  value: "knative.dev/editConfiguration",
                },
                {
                  type: "hidden",
                  name: "configuration",
                  value: YAML.stringify(JSON.parse(JSON.stringify(this.configuration)), { sortMapEntries: true }),
                },
                {
                  type: "text",
                  name: "image",
                  value: spec.template.spec?.containers[0].image || "",
                  label: "Image",
                  configuration: {},
                },
              ],
            },
            modal: false,
          },
        ],
      },
      factoryMetadata: {
        title: [new TextFactory({ value: "Spec" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toStatusComponent(): Component<any> {
    const { status } = this.configuration;

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

  toRevisionListComponent(): Component<any> {
    return new RevisionListFactory({
      revisions: this.revisions,
      baseHref: `/knative/configurations/${this.configuration.metadata.name}`,
      factoryMetadata: {
        title: [new TextFactory({ value: "Revisions" }).toComponent()],
      },
    }).toComponent();
  }

}
