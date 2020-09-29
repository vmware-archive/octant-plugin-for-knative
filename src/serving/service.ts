/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1PodTemplateSpec, V1ObjectReference } from "@kubernetes/client-node";
import YAML from "yaml";

// components
import { ButtonGroupFactory } from "@project-octant/plugin/components/button-group";
import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { FlexLayoutFactory } from "@project-octant/plugin/components/flexlayout";
import { GridActionsFactory } from "@project-octant/plugin/components/grid-actions";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { ListFactory } from "@project-octant/plugin/components/list";
import { ResourceViewerConfig } from "@project-octant/plugin/components/resource-viewer";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { TableFactory } from '@project-octant/plugin/components/table';
import { TextFactory } from "@project-octant/plugin/components/text";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";

import { RevisionListFactory, Revision } from "./revision";
import { TrafficPolicyTableFactory, TrafficPolicy, Route } from "./route";

import { ConditionSummaryFactory, ConditionStatusFactory, Condition } from "./conditions";
import { KnativeResourceViewerFactory, Node, Edge } from "./resource-viewer";
import { deleteGridAction, ServingV1, ServingV1Service, ServingV1Revision, ServingV1Configuration, ServingV1Route } from "../utils";
import { DashboardClient } from "../utils";
import { Configuration } from "./configuration";

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
    address?: {
      url?: string;
    };
    latestCreatedRevisionName?: string;
    latestReadyRevisionName?: string;
    traffic: TrafficPolicy[];
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
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class ServiceListFactory implements ComponentFactory<any> {
  private readonly services: Service[];
  private readonly buttonGroup?: ButtonGroupFactory;
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ services, buttonGroup, linker, factoryMetadata }: ServiceListParameters) {
    this.services = services;
    this.buttonGroup = buttonGroup;
    this.linker = linker;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    let rows = this.services.map(service => {
      const { metadata, spec, status } = service;

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      let notFound = new TextFactory({ value: '<not found>' }).toComponent();

      const row = {
        '_action': new GridActionsFactory({
          actions: [
            deleteGridAction(service),
          ],
        }).toComponent(),
        'Name': new LinkFactory({
          value: metadata.name || '',
          // TODO manage internal links centrally
          ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Service, name: metadata.name }),
          options: {
            status: ready.statusCode(),
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
      } as { [key: string]: Component<any> };

      if (metadata?.deletionTimestamp) {
        row['_isDeleted'] = new TextFactory({ value: "deleted" }).toComponent();
      }

      return row;
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
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class ServiceSummaryFactory implements ComponentFactory<any> {
  private readonly service: Service;
  private readonly revisions: Revision[];
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ service, revisions, linker, factoryMetadata }: ServiceDetailParameters) {
    this.service = service;
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
    const { metadata, status } = this.service;

    let unknown = new TextFactory({ value: '<unknown>' }).toComponent();

    const summary = new SummaryFactory({
      sections: [
        { header: "Ready", content: new ConditionStatusFactory({ conditions: status.conditions, type: "Ready" }).toComponent() },
        { header: "Configurations Ready", content: new ConditionStatusFactory({ conditions: status.conditions, type:  "ConfigurationsReady" }).toComponent() },
        { header: "Routes Ready", content: new ConditionStatusFactory({ conditions: status.conditions, type: "RoutesReady" }).toComponent() },
        { header: "Address", content: status.address?.url ? new LinkFactory({ value: status.address?.url, ref: status.address?.url }).toComponent() : unknown },
        { header: "URL", content: status.url ? new LinkFactory({ value: status.url, ref: status.url }).toComponent() : unknown },
        { header: "Latest Created Revision", content: status.latestCreatedRevisionName ? new LinkFactory({ value: status.latestCreatedRevisionName, ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: status.latestCreatedRevisionName }, { apiVersion: ServingV1, kind: ServingV1Service, name: metadata.name }) }).toComponent() : unknown },
        { header: "Latest Ready Revision", content: status.latestReadyRevisionName ? new LinkFactory({ value: status.latestReadyRevisionName, ref: this.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: status.latestReadyRevisionName }, { apiVersion: ServingV1, kind: ServingV1Service, name: metadata.name }) }).toComponent() : unknown },
      ],
      factoryMetadata: {
        title: [new TextFactory({ value: "Status" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toTrafficPolicyComponent(): Component<any> {
    return new TrafficPolicyTableFactory({ trafficPolicy: this.service.spec.traffic, linker: this.linker }).toComponent();
  }

  toRevisionListComponent(): Component<any> {
    return new RevisionListFactory({
      revisions: this.revisions,
      context: { apiVersion: ServingV1, kind: ServingV1Service, name: this.service.metadata.name },
      linker: this.linker,
      factoryMetadata: {
        title: [new TextFactory({ value: "Revisions" }).toComponent()],
      },
    }).toComponent();
  }

}

interface ServiceResourceViewerParameters {
  service: Service;
  dashboardClient: DashboardClient;
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class ServiceResourceViewerFactory implements ComponentFactory<ResourceViewerConfig> {
  private readonly service: Service;
  private readonly dashboardClient: DashboardClient;
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  private readonly nodes: {[key: string]: Node};
  private readonly edges: {[key: string]: Edge[]};

  constructor({ service, dashboardClient, linker, factoryMetadata }: ServiceResourceViewerParameters) {
    this.service = service;
    this.dashboardClient = dashboardClient;
    this.linker = linker;
    this.factoryMetadata = factoryMetadata;

    this.nodes = {};
    this.edges = {};
  }

  toComponent(): Component<ResourceViewerConfig> {
    const rv = new KnativeResourceViewerFactory({ self: this.service, linker: this.linker, factoryMetadata: this.factoryMetadata });

    // add service
    rv.addNode(this.service);

    // add owners
    for (const ownerReference of this.service.metadata.ownerReferences || []) {
      try {
        const owner = this.dashboardClient.Get({
          apiVersion: ownerReference.apiVersion,
          kind: ownerReference.kind,
          namespace: this.service.metadata.namespace,
          name: ownerReference.name,
        });
        rv.addEdge(this.service, owner, "explicit");
      } catch (e) {
        // TODO handle notfound vs other errors
      }
    }

    // add child configuration
    try {
      const configurations: Configuration[] = this.dashboardClient.List({
        apiVersion: ServingV1,
        kind: ServingV1Configuration,
        namespace: this.service.metadata.namespace,
        selector: { "serving.knative.dev/service": this.service.metadata.name },
      });
      for (const configuration of configurations) {
        rv.addEdge(this.service, configuration, "explicit");

        // add child revisions
        try {
          const revisions: Revision[] = this.dashboardClient.List({
            apiVersion: ServingV1,
            kind: ServingV1Revision,
            namespace: configuration.metadata.namespace,
            selector: { "serving.knative.dev/configuration": configuration.metadata.name },
          });
          for (const revision of revisions) {
            rv.addEdge(configuration, revision, "explicit");
          }
        } catch (e) {
          // TODO handle notfound vs other errors
        }
      }
    } catch (e) {
      // TODO handle notfound vs other errors
    }

    // add child route
    try {
      const routes: Route[] = this.dashboardClient.List({
        apiVersion: ServingV1,
        kind: ServingV1Route,
        namespace: this.service.metadata.namespace,
        selector: { "serving.knative.dev/service": this.service.metadata.name },
      });
      for (const route of routes) {
        rv.addEdge(this.service, route, "explicit");
      }
    } catch (e) {
      // TODO handle notfound vs other errors
    }

    return rv.toComponent();
  }
}
