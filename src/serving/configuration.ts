/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1PodTemplateSpec, V1ObjectReference } from "@kubernetes/client-node";
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

import { RevisionListFactory, Revision } from "./revision";

import { ConditionSummaryFactory, ConditionStatusFactory, Condition } from "./conditions";
import { deleteGridAction, ServingV1, ServingV1Configuration, ServingV1Revision } from "../utils";

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
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class ConfigurationListFactory implements ComponentFactory<any> {
  private readonly configurations: Configuration[];
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ configurations, linker, factoryMetadata }: ConfigurationListParameters) {
    this.configurations = configurations;
    this.linker = linker;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    let rows = this.configurations.map(configuration => {
      const { metadata, spec, status } = configuration;

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      let notFound = new TextFactory({ value: '<not found>' }).toComponent();

      const row = {
        '_action': new GridActionsFactory({
          actions: [
            deleteGridAction(configuration),
          ],
        }).toComponent(),
        'Name': new LinkFactory({
          value: metadata.name || '',
          ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Configuration, name: metadata.name }),
          options: {
            status: ready.statusCode(),
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
      } as { [key: string]: Component<any> };

      if (metadata?.deletionTimestamp) {
        row['_isDeleted'] = new TextFactory({ value: "deleted" }).toComponent();
      }

      return row;
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
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class ConfigurationSummaryFactory implements ComponentFactory<any> {
  private readonly configuration: Configuration;
  private readonly revisions: Revision[];
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ configuration, revisions, linker, factoryMetadata }: ConfigurationDetailParameters) {
    this.configuration = configuration;
    this.revisions = revisions;
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
            name: "Configure",
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
                  name: "revisionName",
                  value: "",
                  label: "Revision Name",
                  configuration: {},
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
    const { metadata, status } = this.configuration;

    let unknown = new TextFactory({ value: '<unknown>' }).toComponent();

    const summary = new SummaryFactory({
      sections: [
        { header: "Ready", content: new ConditionStatusFactory({ conditions: status.conditions, type: "Ready" }).toComponent() },
        { header: "Latest Created Revision", content: status.latestCreatedRevisionName ? new LinkFactory({ value: status.latestCreatedRevisionName, ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: status.latestCreatedRevisionName }, { apiVersion: ServingV1, kind: ServingV1Configuration, name: metadata.name }) }).toComponent() : unknown },
        { header: "Latest Ready Revision", content: status.latestReadyRevisionName ? new LinkFactory({ value: status.latestReadyRevisionName, ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: status.latestReadyRevisionName }, { apiVersion: ServingV1, kind: ServingV1Configuration, name: metadata.name }) }).toComponent() : unknown },
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
      context: { apiVersion: ServingV1, kind: ServingV1Configuration, name: this.configuration.metadata.name },
      linker: this.linker,
      factoryMetadata: {
        title: [new TextFactory({ value: "Revisions" }).toComponent()],
      },
    }).toComponent();
  }

}
