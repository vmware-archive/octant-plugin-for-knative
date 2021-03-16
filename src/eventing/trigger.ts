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
import { EventingV1, EventingV1Broker, EventingV1Trigger, Trigger } from "./api";

interface TriggerListParameters {
  triggers: Trigger[];
  factoryMetadata?: FactoryMetadata;
}

export class TriggerListFactory implements ComponentFactory<any> {
  protected readonly triggers: Trigger[];
  protected readonly factoryMetadata?: FactoryMetadata;

  constructor({ triggers, factoryMetadata }: TriggerListParameters) {
    this.triggers = triggers;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<TableConfig> {
    const columns = {
      name: 'Name',
      broker: 'Broker',
      subscriber: 'Subscriber',
      subscriberType: 'Subscriber Type',
      age: 'Age',
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.name,
      columns.broker,
      columns.subscriber,
      columns.subscriberType,
      columns.age,
    ];
    table.loading = false;
    table.emptyContent = "There are no triggers!";
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '*not found*', options: { isMarkdown: true } });
    for (const trigger of this.triggers) {
      const { metadata, spec, status } = trigger;
      const { broker, subscriber } = spec

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      const row = new h.TableRow(
        {
          [columns.name]: new LinkFactory({
            value: metadata.name || '',
            ref: ctx.linker({
              apiVersion: EventingV1,
              kind: EventingV1Trigger,
              name: metadata.name,
              namespace: metadata.namespace
            }),

            options: {
              status: ready.statusCode(),
              statusDetail: ready.toComponent(),
            },
          }),
          [columns.broker]: broker
            ? new LinkFactory({
              value: broker,
              ref: ctx.linker({
                name: broker,
                apiVersion: EventingV1,
                kind: EventingV1Broker,
                namespace: ctx.namespace,
              })
            })
            : notFound,
          [columns.subscriber]: subscriber.ref
            ? new LinkFactory({
              value: subscriber.ref.name,
              ref: ctx.linker(subscriber.ref)
            })
            : subscriber.uri ? new TextFactory({ value: subscriber.uri }) : notFound,
          [columns.subscriberType]: subscriber.ref
            ? new TextFactory({
              value: `${subscriber.ref.kind.toLowerCase()}s.${subscriber.ref.apiVersion.split("/")[0]}`,
            })
            : notFound,
          [columns.age]: new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) })
        },
        {
          isDeleting: !!metadata?.deletionTimestamp,
          gridActions: new GridActionsFactory({
            actions: [
              deleteGridAction(trigger),
            ]
          }),
        }
      );
      table.push(row);
    }

    return table.getFactory().toComponent();
  }
}

interface TriggerDetailParameters {
  trigger: Trigger;
  factoryMetadata?: FactoryMetadata;
}
export class TriggerSummaryFactory implements ComponentFactory<any> {
  private readonly trigger: Trigger;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ trigger, factoryMetadata }: TriggerDetailParameters) {
    this.trigger = trigger;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<any> {
    const layout = new FlexLayoutFactory({
      options: {
        sections: [
          [
            { view: this.toSpecComponent(), width: h.Width.Full },
            { view: this.toStatusComponent(), width: h.Width.Full },
          ],
        ],
      },
      factoryMetadata: this.factoryMetadata,
    });
    return layout.toComponent();
  }

  toSpecComponent(): Component<any> {
    const { spec } = this.trigger;
    const { broker } = spec

    const sections: { header: string, content: Component<any> }[] = [];

    sections.push({
      header: "Broker",
      content: broker
        ? new LinkFactory({
          value: broker,
          ref: ctx.linker({
            name: broker,
            apiVersion: EventingV1,
            kind: EventingV1Broker,
            namespace: ctx.namespace,
          })
        }).toComponent()
        : new TextFactory({ value: '*empty*', options: { isMarkdown: true } }).toComponent(),
    })

    if (spec.filter?.attributes) {
      sections.push({
        header: "Filter Attributes",
        // TODO: Maybe attributes should link to event sources?
        content: new AnnotationsFactory({
          annotations: spec.filter.attributes || new TextFactory({ value: "No Filter Attributes" }).toComponent(),
        }).toComponent(),
      })
    }

    if (spec.subscriber) {
      if (spec.subscriber.ref) {
        sections.push({
          header: "Subscriber",
          content: new KReferenceTableFactory({ kreference: spec.subscriber.ref }).toComponent(),
        })
      }
      if (spec.subscriber.uri) {
        sections.push({
          header: "Subscriber",
          content: new TextFactory({ value: spec.subscriber.uri }).toComponent(),
        })
      }
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
    const { metadata, status } = this.trigger;

    let unknown = new TextFactory({ value: '*unknown*', options: { isMarkdown: true } }).toComponent();

    const sections = [];

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
      conditions: this.trigger.status.conditions || [],
      factoryMetadata: {
        title: [new TextFactory({ value: "Conditions" }).toComponent()],
      },
    }).toComponent();
  }
}
