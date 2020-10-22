/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import YAML from "yaml";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

// components
import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { ConditionSummaryFactory, ConditionListFactory } from "../components/conditions";
import { FlexLayoutFactory } from "@project-octant/plugin/components/flexlayout";
import { GridActionsFactory } from "@project-octant/plugin/components/grid-actions";
import { deleteGridAction } from "../components/grid-actions";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { containerPorts, environmentList, PodSpecable, volumeMountList } from "../components/pod";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { TextFactory } from "@project-octant/plugin/components/text";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";

import { V1Deployment } from "@kubernetes/client-node";
import { ServingV1, ServingV1Configuration, Configuration, Revision, Route, ServingV1Revision } from "./api";
import { RevisionListFactory } from "./revision";

import ctx from "../context";

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
    const columns = {
      name: 'Name',
      latestCreated: 'Latest Created Revision',
      latestReady: 'Latest Ready Revision',
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

    const notFound = new TextFactory({ value: '*not found*', options: { isMarkdown: true } });
    for (const configuration of this.configurations) {
      const { metadata, spec, status } = configuration;

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      const row = new h.TableRow(
        {
          [columns.name]: new LinkFactory({
            value: metadata.name || '',
            ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Configuration, name: metadata.name }),
            options: {
              status: ready.statusCode(),
              statusDetail: ready.toComponent(),
            },
          }),
          [columns.latestCreated]: status.latestCreatedRevisionName
            ? new LinkFactory({ value: status.latestCreatedRevisionName, ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: status.latestCreatedRevisionName }, { apiVersion: ServingV1, kind: ServingV1Configuration, name: metadata.name }) })
            : notFound,
          [columns.latestReady]: status.latestReadyRevisionName
            ? new LinkFactory({ value: status.latestReadyRevisionName, ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: status.latestReadyRevisionName }, { apiVersion: ServingV1, kind: ServingV1Configuration, name: metadata.name }) })
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
  allRoutes?: Route[];
  factoryMetadata?: FactoryMetadata;
  create?: boolean;
}

export class ConfigurationSummaryFactory implements ComponentFactory<any> {
  private readonly configuration: Configuration;
  private readonly revisions: Revision[];
  private readonly childDeployments?: {[key: string]: V1Deployment};
  private readonly allRoutes?: Route[];
  private readonly factoryMetadata?: FactoryMetadata;
  private readonly create?: boolean;

  constructor({ configuration, revisions, childDeployments, allRoutes, factoryMetadata, create }: ConfigurationDetailParameters) {
    this.configuration = configuration;
    this.revisions = revisions;
    this.childDeployments = childDeployments;
    this.allRoutes = allRoutes;
    this.factoryMetadata = factoryMetadata;
    this.create = create;
  }
  
  toComponent(): Component<any> {
    const layout = new FlexLayoutFactory({
      options: {
        sections: [
          [
            { view: this.toSpecComponent(), width: h.Width.Full },
            { view: this.toStatusComponent(), width: h.Width.Full },
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
    const container = spec.template.spec?.containers[0];

    const actions = [];
    if (this.create && !(metadata.ownerReferences || []).some(r => r.controller)) {
      // only allow for non-controlled resources
      actions.push(configureAction(this.configuration));
    }

    const sections = [];
    sections.push({ header: "Revision Name", content: spec.template.metadata?.name ?
        new TextFactory({ value: spec.template.metadata.name }).toComponent() :
        new TextFactory({ value: '*generated*', options: { isMarkdown: true } }).toComponent() });
    if ((spec.template.metadata?.annotations || {})["autoscaling.knative.dev/minScale"]) {
      sections.push({ header: "Min Scale", content: new TextFactory({ value: (spec.template.metadata?.annotations || {})["autoscaling.knative.dev/minScale"] || "" }).toComponent() });
    }
    if ((spec.template.metadata?.annotations || {})["autoscaling.knative.dev/maxScale"]) {
      sections.push({ header: "Max Scale", content: new TextFactory({ value: (spec.template.metadata?.annotations || {})["autoscaling.knative.dev/maxScale"] || "" }).toComponent() });
    }
    sections.push({ header: "Image", content: container?.image ?
        new TextFactory({ value: container.image }).toComponent() :
        new TextFactory({ value: '*empty*', options: { isMarkdown: true } }).toComponent() });
    if (container?.ports?.length) {
      sections.push({ header: "Container Ports", content: containerPorts(container?.ports) });
    }
    if (container?.env?.length) {
      sections.push({ header: "Environment", content: environmentList(container?.env, metadata.namespace) });
    }
    if (container?.volumeMounts?.length) {
      sections.push({ header: "Volume Mounts", content: volumeMountList(container?.volumeMounts) });
    }

    const summary = new SummaryFactory({
      sections,
      options: { actions },
      factoryMetadata: {
        title: [new TextFactory({ value: "Spec" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toStatusComponent(): Component<any> {
    const summary = new SummaryFactory({
      sections: [
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
      conditions: this.configuration.status.conditions || [],
      factoryMetadata: {
        title: [new TextFactory({ value: "Conditions" }).toComponent()],
      },
    }).toComponent();
  }

  toRevisionListComponent(): Component<any> {
    return new RevisionListFactory({
      revisions: this.revisions,
      latestCreatedRevision: this.configuration.status.latestCreatedRevisionName,
      latestReadyRevision: this.configuration.status.latestReadyRevisionName,
      childDeployments: this.childDeployments,
      allRoutes: this.allRoutes,
      context: { apiVersion: ServingV1, kind: ServingV1Configuration, name: this.configuration.metadata.name },
      factoryMetadata: {
        title: [new TextFactory({ value: "Revisions" }).toComponent()],
      },
    }).toComponent();
  }

}

export function configureAction(resource: PodSpecable): any {
  const container = resource.spec.template.spec?.containers[0];
  return {
    name: "Configure",
    title: "Edit Configuration",
    form: {
      fields: [
        {
          type: "hidden",
          name: "action",
          value: "knative.dev/configure",
        },
        {
          type: "hidden",
          name: "resource",
          value: YAML.stringify(JSON.parse(JSON.stringify(resource)), { sortMapEntries: true }),
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
          value: container?.image || "",
          label: "Image",
          configuration: {},
        },
      ],
    },
    modal: false,
  };
}
