/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as octant from "@project-octant/plugin";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

// components
import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { ButtonGroupFactory } from "@project-octant/plugin/components/button-group";
import { ConditionSummaryFactory, ConditionListFactory } from "../components/conditions";
import { FlexLayoutFactory } from "@project-octant/plugin/components/flexlayout";
import { GridActionsFactory } from "@project-octant/plugin/components/grid-actions";
import { deleteGridAction } from "../components/grid-actions";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { ListFactory } from "@project-octant/plugin/components/list";
import { containerPorts, environmentList, volumeMountList } from "../components/pod";
import { KnativeResourceViewerFactory, ResourceViewerConfig, Node, Edge } from "../components/resource-viewer";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { TextFactory } from "@project-octant/plugin/components/text";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";

import { V1Deployment } from "@kubernetes/client-node";
import { ServingV1, ServingV1Service, ServingV1Revision, ServingV1Configuration, ServingV1Route, Service, Revision, Route, Configuration } from "./api";
import { configureAction } from "./configuration";
import { RevisionListFactory,  } from "./revision";
import { TrafficPolicyTableFactory } from "./route";

import ctx from "../context";



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
                  placeholder: "my-service",
                  error: "Service name is required.",
                  validators: [
                    "required"
                  ],
                  configuration: {},
                },
                {
                  type: "text",
                  name: "revisionName",
                  value: "",
                  label: "Revision Name",
                  placeholder: "v2",
                  configuration: {},
                },
                {
                  type: "text",
                  name: "image",
                  value: "",
                  label: "Image",
                  placeholder: "docker.io/example/app",
                  error: "Image name is required.",
                  validators: [
                    "required"
                  ],
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
    const columns = {
      name: 'Name',
      url: 'URL',
      latestCreated: 'Latest Created Revision',
      latestReady: 'Latest Ready Revision',
      age: 'Age',
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.name,
      columns.url,
      columns.latestCreated,
      columns.latestReady,
      columns.age,
    ];
    table.loading = false;
    table.emptyContent = "There are no services!";
    table.buttonGroup = this.buttonGroup;
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '*not found*', options: { isMarkdown: true } });
    for (const service of this.services) {
      const { metadata, spec, status } = service;

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      const row = new h.TableRow(
        {
          [columns.name]: new LinkFactory({
            value: metadata.name || '',
            ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Service, name: metadata.name }),
            options: {
              status: ready.statusCode(),
              statusDetail: ready.toComponent(),
            },
          }),
          [columns.url]: status.url
            ? new LinkFactory({ value: status.url, ref: status.url })
            : notFound,
          [columns.latestCreated]: status.latestCreatedRevisionName
            ? new LinkFactory({ value: status.latestCreatedRevisionName, ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: status.latestCreatedRevisionName }, { apiVersion: ServingV1, kind: ServingV1Service, name: metadata.name }) })
            : notFound,
          [columns.latestReady]: status.latestReadyRevisionName
            ? new LinkFactory({ value: status.latestReadyRevisionName, ref: ctx.linker({ apiVersion: ServingV1, kind: ServingV1Revision, name: status.latestReadyRevisionName }, { apiVersion: ServingV1, kind: ServingV1Service, name: metadata.name }) })
            : notFound,
          [columns.age]: new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) }),
        },
        {
          isDeleting: !!metadata?.deletionTimestamp,
          gridActions: new GridActionsFactory({
            actions: [
              deleteGridAction(service),
            ]
          }),
        }
      );
      table.push(row);
    }

    return table.getFactory().toComponent();
  }
}

interface ServiceDetailParameters {
  service: Service;
  revisions: Revision[];
  childDeployments?: {[key: string]: V1Deployment};
  allRoutes?: Route[];
  factoryMetadata?: FactoryMetadata;
}

export class ServiceSummaryFactory implements ComponentFactory<any> {
  private readonly service: Service;
  private readonly revisions: Revision[];
  private readonly childDeployments?: {[key: string]: V1Deployment};
  private readonly allRoutes?: Route[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ service, revisions, childDeployments, allRoutes, factoryMetadata }: ServiceDetailParameters) {
    this.service = service;
    this.revisions = revisions;
    this.childDeployments = childDeployments;
    this.allRoutes = allRoutes;
    this.factoryMetadata = factoryMetadata;
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
    const { metadata, spec } = this.service;
    const container = spec.template.spec?.containers[0];

    const actions = [];
    if (ctx.create && !(metadata.ownerReferences || []).some(r => r.controller)) {
      // only allow for non-controlled resources
      actions.push(configureAction(this.service));
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

    sections.push({ header: "Route Visibility", content: new TextFactory({ value: (metadata.labels || {})["serving.knative.dev/visibility"] || "external" }).toComponent() });
    sections.push({ header: "Traffic Policy", content: this.toTrafficPolicyComponent() });

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
    const { metadata, status } = this.service;

    let unknown = new TextFactory({ value: '*unknown*', options: { isMarkdown: true } }).toComponent();

    const sections = [];

    if (status.address?.url !== status.url) {
      sections.push({ header: "External Address", content: status.url ? new LinkFactory({ value: status.url, ref: status.url }).toComponent() : unknown });
    }
    sections.push({ header: "Internal Address", content: status.address?.url ? new LinkFactory({ value: status.address?.url, ref: status.address?.url }).toComponent() : unknown });
    sections.push({ header: "Conditions", content: this.toConditionsListComponent() });

    const summary = new SummaryFactory({
      sections,
      factoryMetadata: {
        title: [new TextFactory({ value: "Status" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toConditionsListComponent(): Component<any> {
    return new ConditionListFactory({
      conditions: this.service.status.conditions || [],
      factoryMetadata: {
        title: [new TextFactory({ value: "Conditions" }).toComponent()],
      },
    }).toComponent();
  }

  toTrafficPolicyComponent(): Component<any> {
    return new TrafficPolicyTableFactory({
      trafficPolicy: this.service.spec.traffic,
      trafficPolicyStatus: this.service.status.traffic,
      latestRevision: this.service.status.latestReadyRevisionName,
      linkerContext: { apiVersion: ServingV1, kind: ServingV1Service, name: this.service.metadata.name },
    }).toComponent();
  }

  toRevisionListComponent(): Component<any> {
    return new RevisionListFactory({
      revisions: this.revisions,
      latestCreatedRevision: this.service.status.latestCreatedRevisionName,
      latestReadyRevision: this.service.status.latestReadyRevisionName,
      childDeployments: this.childDeployments,
      allRoutes: this.allRoutes,
      context: { apiVersion: ServingV1, kind: ServingV1Service, name: this.service.metadata.name },
      factoryMetadata: {
        title: [new TextFactory({ value: "Revisions" }).toComponent()],
      },
    }).toComponent();
  }

}

interface ServiceResourceViewerParameters {
  service: Service;
  factoryMetadata?: FactoryMetadata;
}

export class ServiceResourceViewerFactory implements ComponentFactory<ResourceViewerConfig> {
  private readonly service: Service;
  private readonly factoryMetadata?: FactoryMetadata;

  private readonly nodes: {[key: string]: Node};
  private readonly edges: {[key: string]: Edge[]};

  constructor({ service, factoryMetadata }: ServiceResourceViewerParameters) {
    this.service = service;
    this.factoryMetadata = factoryMetadata;

    this.nodes = {};
    this.edges = {};
  }

  toComponent(): Component<ResourceViewerConfig> {
    const rv = new KnativeResourceViewerFactory({ self: this.service, factoryMetadata: this.factoryMetadata });

    // add service
    rv.addNode(this.service);

    // add owners
    for (const ownerReference of this.service.metadata.ownerReferences || []) {
      try {
        const owner = ctx.dashboardClient.Get({
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
      const configurations: Configuration[] = ctx.dashboardClient.List({
        apiVersion: ServingV1,
        kind: ServingV1Configuration,
        namespace: this.service.metadata.namespace,
        selector: { "serving.knative.dev/service": this.service.metadata.name },
      });
      for (const configuration of configurations) {
        rv.addEdge(this.service, configuration, "explicit");

        // add child revisions
        try {
          const revisions: Revision[] = ctx.dashboardClient.List({
            apiVersion: ServingV1,
            kind: ServingV1Revision,
            namespace: configuration.metadata.namespace,
            selector: { "serving.knative.dev/configuration": configuration.metadata.name },
          });
          revisions.sort((a, b) => {
            const generationA = (a.metadata.labels || {})['serving.knative.dev/configurationGeneration'] || '-1';
            const generationB = (b.metadata.labels || {})['serving.knative.dev/configurationGeneration'] || '-1';
            return parseInt(generationA) - parseInt(generationB);
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
      const routes: Route[] = ctx.dashboardClient.List({
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
