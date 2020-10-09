/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1PodTemplateSpec, V1ObjectReference, V1Deployment } from "@kubernetes/client-node";
import YAML from "yaml";

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
    const columns = {
      name: 'Name',
      latestCreated: 'Latest Created',
      latestReady: 'Latest Ready',
      age: 'Age',
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.name,
      columns.latestCreated,
      columns.latestReady,
      columns.age,
    ];
    table.loading = false;
    table.emptyContent = "There are no configurations!";
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '<not found>' });
    for (const configuration of this.configurations) {
      const { metadata, spec, status } = configuration;

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      const row = new h.TableRow(
        {
          [columns.name]: new LinkFactory({
            value: metadata.name || '',
            ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Configuration, name: metadata.name }),
            options: {
              status: ready.statusCode(),
              statusDetail: ready.toComponent(),
            },
          }),
          [columns.latestCreated]: status.latestCreatedRevisionName
            ? new TextFactory({ value: status.latestCreatedRevisionName })
            : notFound,
          [columns.latestReady]: status.latestReadyRevisionName
            ? new TextFactory({ value: status.latestReadyRevisionName })
            : notFound,
          [columns.age]: new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) }),
        },
        {
          isDeleting: !!metadata?.deletionTimestamp,
          gridActions: new GridActionsFactory({
            actions: [
              deleteGridAction(configuration),
            ]
          }),
        }
      );    
      table.push(row);   
    }

    return table.getFactory().toComponent();
  }
}

interface ConfigurationDetailParameters {
  configuration: Configuration;
  revisions: Revision[];
  childDeployments?: {[key: string]: V1Deployment};
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class ConfigurationSummaryFactory implements ComponentFactory<any> {
  private readonly configuration: Configuration;
  private readonly revisions: Revision[];
  private readonly childDeployments?: {[key: string]: V1Deployment};
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ configuration, revisions, childDeployments, linker, factoryMetadata }: ConfigurationDetailParameters) {
    this.configuration = configuration;
    this.revisions = revisions;
    this.childDeployments = childDeployments;
    this.linker = linker;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const layout = new FlexLayoutFactory({
      options: {
        sections: [
          [
            { view: this.toSpecComponent(), width: h.Width.Half },
            { view: this.toStatusComponent(), width: h.Width.Half },
            { view: this.toRevisionListComponent(), width: h.Width.Full },
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
      childDeployments: this.childDeployments,
      context: { apiVersion: ServingV1, kind: ServingV1Configuration, name: this.configuration.metadata.name },
      linker: this.linker,
      factoryMetadata: {
        title: [new TextFactory({ value: "Revisions" }).toComponent()],
      },
    }).toComponent();
  }

}
