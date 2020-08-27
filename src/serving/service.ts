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
import { ListFactory } from "../octant/list";
import { TableFactory } from '../octant/table';
import { TextFactory } from "../octant/text";
import { TimestampFactory } from "../octant/timestamp";
import { SummaryFactory } from "../octant/summary";

import { ConditionSummaryFactory, Condition, ConditionStatus } from "./conditions";
import { RevisionListFactory, Revision } from "./revision";
import { TrafficPolicyTableFactory, TrafficPolicy } from "./route";
import { deleteGridAction } from "./utils";
import { ButtonGroupFactory } from "../octant/button-group";

// TODO fully fresh out
export interface Service {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    template: V1PodTemplateSpec;
    traffic: TrafficPolicy[];
  };
  status: {
    conditions?: Condition[];
    url?: string;
    latestCreatedRevisionName?: string;
    latestReadyRevisionName?: string;
  };
}

interface NewServiceParameters {
  clientID: string;
  factoryMetadata?: FactoryMetadata;
}

export class NewServiceFactory implements ComponentFactory<any> {
  private readonly clientID: string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ clientID, factoryMetadata }: NewServiceParameters) {
    this.clientID = clientID;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    // TODO hack to render a form, any form. Replace with something real
    const form = new SummaryFactory({
      sections: [],
      options: {
        actions: [
          {
            name: "Configure",
            title: "Create Service",
            form: {
              fields: [
                {
                  type: "hidden",
                  name: "action",
                  value: "knative.dev/newService",
                },
                {
                  type: "hidden",
                  name: "clientID",
                  value: this.clientID,
                },
                {
                  type: "text",
                  name: "name",
                  value: "",
                  label: "Name",
                  configuration: {},
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
                  value: "",
                  label: "Image",
                  configuration: {},
                },
              ],
            },
            modal: false,
          },
        ],
      },
    });
    const layout = new ListFactory({
      items: [form.toComponent()],
      factoryMetadata: this.factoryMetadata,
    });
    return layout.toComponent();
  }
}

interface ServiceListParameters {
  services: Service[];
  buttonGroup?: ButtonGroupFactory;
  factoryMetadata?: FactoryMetadata;
}

export class ServiceListFactory implements ComponentFactory<any> {
  private readonly services: Service[];
  private readonly buttonGroup?: ButtonGroupFactory;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ services, buttonGroup, factoryMetadata }: ServiceListParameters) {
    this.services = services;
    this.buttonGroup = buttonGroup;
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
      ...(this.buttonGroup && { buttonGroup: this.buttonGroup }),
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
            { view: this.toTrafficPolicyComponent(), width: 12 },
            { view: this.toRevisionListComponent(), width: 12 },
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
      options: {
        actions: [
          {
            name: "Configure",
            title: "Edit Service",
            form: {
              fields: [
                {
                  type: "hidden",
                  name: "action",
                  value: "knative.dev/editService",
                },
                {
                  type: "hidden",
                  name: "service",
                  value: YAML.stringify(JSON.parse(JSON.stringify(this.service)), { sortMapEntries: true }),
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

  toTrafficPolicyComponent(): Component<any> {
    return new TrafficPolicyTableFactory({ trafficPolicy: this.service.spec.traffic }).toComponent();
  }

  toRevisionListComponent(): Component<any> {
    return new RevisionListFactory({
      revisions: this.revisions,
      baseHref: `/knative/services/${this.service.metadata.name}`,
      factoryMetadata: {
        title: [new TextFactory({ value: "Revisions" }).toComponent()],
      },
    }).toComponent();
  }

}
