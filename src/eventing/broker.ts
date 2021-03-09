/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { AnnotationsFactory } from "@project-octant/plugin/components/annotations";
import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { FlexLayoutFactory } from "@project-octant/plugin/components/flexlayout";
import { GridActionsFactory } from "@project-octant/plugin/components/grid-actions";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { TableConfig } from "@project-octant/plugin/components/table";
import { TextFactory } from "@project-octant/plugin/components/text";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";
// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";
import { ConditionListFactory, ConditionSummaryFactory } from "../components/conditions";
import { deleteGridAction } from "../components/grid-actions";
import { KReferenceTableFactory } from "../components/kreference";
import ctx from "../context";
import { Broker, EventingV1, EventingV1Broker } from "./api";

interface BrokerListParameters {
  brokers: Broker[];
  factoryMetadata?: FactoryMetadata;
}

export class BrokerListFactory implements ComponentFactory<any> {
  protected readonly brokers: Broker[];
  protected readonly factoryMetadata?: FactoryMetadata;

  constructor({ brokers, factoryMetadata }: BrokerListParameters) {
    this.brokers = brokers;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<TableConfig> {
    const columns = {
      name: 'Name',
      url: 'URL',
      config: 'Config',
      configType: 'Config Type',
      age: 'Age',
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.name,
      columns.url,
      columns.config,
      columns.configType,
      columns.age,
    ];
    table.loading = false;
    table.emptyContent = "There are no brokers!";
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '*not found*', options: { isMarkdown: true } });
    for (const broker of this.brokers) {
      const { kind, metadata, spec, status } = broker;
      const { config } = spec
      const { address } = status
      if (config) {
        config.namespace = config.namespace || ctx.namespace
      }

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      const row = new h.TableRow(
        {
          [columns.name]: new LinkFactory({
            value: metadata.name || '',
            ref: ctx.linker({
              apiVersion: EventingV1,
              kind: EventingV1Broker,
              name: metadata.name,
              namespace: metadata.namespace
            }),

            options: {
              status: ready.statusCode(),
              statusDetail: ready.toComponent(),
            },
          }),
          // TODO: source -> sink link should work for a uri type sink
          [columns.url]: address.url
            ? new LinkFactory({ value: address.url, ref: address.url })
            : notFound,
          [columns.config]: config
            ? new LinkFactory({
              value: config.name,
              ref: ctx.linker(config)
            })
            : notFound,
          [columns.configType]: config
            ? new TextFactory({
              value: `${config.kind.toLowerCase()}s.${config.apiVersion.split("/")[0]}`,
            })
            : notFound,
          [columns.age]: new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) })
        },
        {
          isDeleting: !!metadata?.deletionTimestamp,
          gridActions: new GridActionsFactory({
            actions: [
              deleteGridAction(broker),
            ]
          }),
        }
      );
      table.push(row);
    }

    return table.getFactory().toComponent();
  }
}

interface BrokerDetailParameters {
  broker: Broker;
  factoryMetadata?: FactoryMetadata;
}
export class BrokerSummaryFactory implements ComponentFactory<any> {
  private readonly broker: Broker;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ broker, factoryMetadata }: BrokerDetailParameters) {
    this.broker = broker;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<any> {
    const layout = new FlexLayoutFactory({
      options: {
        sections: [
          [
            { view: this.toSpecComponent(), width: h.Width.Full },
            { view: this.toStatusComponent(), width: h.Width.Full },
            // TODO: this should have a trigger list component
            // { view: this.toRevisionListComponent(), width: h.Width.Full },
          ],
        ],
      },
      factoryMetadata: this.factoryMetadata,
    });
    return layout.toComponent();
  }

  toSpecComponent(): Component<any> {
    const { metadata, spec } = this.broker;

    const sections: { header: string, content: Component<any> }[] = [];

      sections.push({
        header: "Config",
        content: spec.config
          ? new KReferenceTableFactory({ kreference: spec.config }).toComponent()
          : new TextFactory({ value: '*empty*', options: { isMarkdown: true } }).toComponent(),
      })

    if (spec.delivery?.deadLetterSink) {
      if (spec.delivery.deadLetterSink.ref) {
        sections.push({
          header: "Dead Letter Sink",
          content: new KReferenceTableFactory({ kreference: spec.delivery.deadLetterSink.ref }).toComponent(),
        })
      }
      if (spec.delivery.deadLetterSink.uri) {
        sections.push({
          header: "Dead Letter Sink",
          content: new TextFactory({ value: spec.delivery.deadLetterSink.uri }).toComponent(),
        })
      }
    } else {
      sections.push({
        header: "Dead Letter Sink",
        content: new TextFactory({ value: '*empty*', options: { isMarkdown: true } }).toComponent()
      })
    }

    if (spec.delivery?.retry) {
      sections.push({
        header: "Retry",
        content: new TextFactory({ value: spec.delivery.retry.toString() }).toComponent(),
      })
    }

    if (spec.delivery?.backoffPolicy) {
      sections.push({
        header: "Backoff Policy",
        content: new TextFactory({ value: spec.delivery.backoffPolicy }).toComponent(),
      })
    }

    if (spec.delivery?.backoffDelay) {
      sections.push({
        header: "Backoff Delay",
        content: new TextFactory({ value: spec.delivery.backoffDelay }).toComponent(),
      })
    }

    const summary = new SummaryFactory({
      sections,
      factoryMetadata: {
        title: [new TextFactory({ value: "Spec" }).toComponent()],
      },
    });
    return summary.toComponent();
  }

  toStatusComponent(): Component<any> {
    const { metadata, status } = this.broker;

    let unknown = new TextFactory({ value: '*unknown*', options: { isMarkdown: true } }).toComponent();

    const sections = [];

    sections.push({
      header: "Address",
      content: status.address?.url
        ? new LinkFactory({ value: status.address?.url, ref: status.address?.url }).toComponent()
        : unknown
    });

    if (status.annotations) {
      sections.push({
        header: "Annotations",
        content: new AnnotationsFactory({
          annotations: status.annotations || {},
        }).toComponent(),
      });
    }

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
      conditions: this.broker.status.conditions || [],
      factoryMetadata: {
        title: [new TextFactory({ value: "Conditions" }).toComponent()],
      },
    }).toComponent();
  }
}
