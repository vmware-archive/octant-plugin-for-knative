/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1PodTemplateSpec } from "@kubernetes/client-node";

import { ConditionSummaryFactory, Condition, ConditionStatus } from "./conditions";

// components
import { Component } from "../octant/component";
import { ComponentFactory, FactoryMetadata } from "../octant/component-factory";
import { GridActionsFactory } from "../octant/grid-actions";
import { LinkFactory } from "../octant/link";
import { TableFactory } from '../octant/table';
import { TextFactory } from "../octant/text";
import { TimestampFactory } from "../octant/timestamp";
import { FlexLayoutFactory } from "../octant/flexlayout";
import { SummaryFactory } from "../octant/summary";

import { RevisionListFactory, Revision } from "./revision";
import { deleteGridAction } from "./utils";

// TODO fully fresh out
export interface Service {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    template: V1PodTemplateSpec;
  };
  status: {
    conditions?: Condition[];
    url?: string;
    latestCreatedRevisionName?: string;
    latestReadyRevisionName?: string;
  };
}

interface ServiceListParameters {
  services: Service[];
  factoryMetadata?: FactoryMetadata;
}

export class ServiceListFactory implements ComponentFactory<any> {
  private readonly services: Service[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ services, factoryMetadata }: ServiceListParameters) {
    this.services = services;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    let rows = this.services.map(service => {
      const { metadata, spec, status } = service;

      const conditions = (status.conditions || []) as Condition[];
      const ready = new ConditionSummaryFactory({ condition: conditions.find(cond => cond.type === "Ready") });

      let notFound = new TextFactory({ value: '<not found>' }).toComponent();

      return {
        '_action': new GridActionsFactory({
          actions: [
            deleteGridAction(service),
          ],
        }).toComponent(),
        'Name': new LinkFactory({
          value: metadata.name || '',
          // TODO manage internal links centrally
          ref: `/knative/services/${metadata.name}`,
          options: {
            status: ready.status(),
            statusDetail: ready.toComponent(),
          },
        }).toComponent(),
        'URL': status.url
          ? new LinkFactory({ value: status.url, ref: status.url }).toComponent()
          : notFound,
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
      'URL',
      'Latest Created',
      'Latest Ready',
      'Age',
    ].map(name => ({ name, accessor: name }));

    let table = new TableFactory({
      columns,
      rows,
      emptyContent: "There are no services!",
      loading: false,
      filters: {},
      factoryMetadata: this.factoryMetadata,
    });

    return table.toComponent();
  }
}

interface ServiceDetailParameters {
  service: Service;
  revisions: Revision[];
  factoryMetadata?: FactoryMetadata;
}

export class ServiceSummaryFactory implements ComponentFactory<any> {
  private readonly service: Service;
  private readonly revisions: Revision[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ service, revisions, factoryMetadata }: ServiceDetailParameters) {
    this.service = service;
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
    const { metadata, spec } = this.service;

    const summary = new SummaryFactory({
      sections: [
        { header: "Image", content: new TextFactory({ value: spec.template.spec?.containers[0].image || '<not found>' }).toComponent() },
      ],
      factoryMetadata: {
        title: [new TextFactory({ value: "Spec" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toStatusComponent(): Component<any> {
    const { status } = this.service;

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
      factoryMetadata: {
        title: [new TextFactory({ value: "Revisions" }).toComponent()],
      },
    }).toComponent();
  }

}
