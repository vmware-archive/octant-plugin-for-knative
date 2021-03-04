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
import { ConditionSummaryFactory, } from "../components/conditions";
import { GridActionsFactory } from "@project-octant/plugin/components/grid-actions";
import { deleteGridAction } from "../components/grid-actions";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { TextFactory } from "@project-octant/plugin/components/text";
import { Source } from "./api";

import ctx from "../context";
import { FlexLayoutFactory } from "@project-octant/plugin/components/flexlayout";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { V1CustomResourceColumnDefinition, V1CustomResourceDefinitionVersion } from "@kubernetes/client-node";
import { TableConfig } from "@project-octant/plugin/components/table";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";

interface SourceListParameters {
  sources: Source[];
  factoryMetadata?: FactoryMetadata;
  crdVersion?: V1CustomResourceDefinitionVersion
}

export class SourceListFactory implements ComponentFactory<any> {
  protected readonly sources: Source[];
  protected readonly factoryMetadata?: FactoryMetadata;

  constructor({ sources, factoryMetadata }: SourceListParameters) {
    this.sources = sources;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<TableConfig> {
    const columns = {
      name: 'Name',
      type: 'Type',
      sink: 'Sink',
      sinkType: 'Sink Type',
      age: 'Age',
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.name,
      columns.type,
      columns.sink,
      columns.sinkType,
      columns.age,
    ];
    table.loading = false;
    table.emptyContent = "There are no sources!";
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '*not found*', options: { isMarkdown: true } });
    for (const source of this.sources) {
      const { kind, metadata, spec, status } = source;
      const sink = spec.sink
      if (sink.ref) {
        sink.ref.namespace = sink.ref.namespace || ctx.namespace
      }

      const ready = new ConditionSummaryFactory({ conditions: status.conditions, type: "Ready" });

      const row = new h.TableRow(
        {
          [columns.name]: new LinkFactory({
            value: metadata.name || '',
            ref: `/knative/eventing/sources/${kind}/${metadata.name}`,
            options: {
              status: ready.statusCode(),
              statusDetail: ready.toComponent(),
            },
          }),
          [columns.type]: new LinkFactory({
            value: kind,
            ref: `/knative/eventing/sources/${kind}`,
          }),
          // TODO: source -> sink link should work for a uri type sink
          [columns.sink]: sink.ref
            ? new LinkFactory({
              value: sink.ref.name,
              ref: ctx.linker(sink.ref)
            })
            : sink.uri ? new TextFactory({ value: sink.uri }) : notFound,
          [columns.sinkType]: sink.ref
            ? new TextFactory({
              value: `${sink.ref.kind.toLowerCase()}s.${sink.ref.apiVersion.split("/")[0]}`,
            })
            : notFound,
          [columns.age]: new TimestampFactory({ timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000) })
        },
        {
          isDeleting: !!metadata?.deletionTimestamp,
          gridActions: new GridActionsFactory({
            actions: [
              deleteGridAction(source),
            ]
          }),
        }
      );
      table.push(row);
    }

    return table.getFactory().toComponent();
  }
}

interface TypedSourceListParamters extends SourceListParameters {
  additionalColumns?: Array<V1CustomResourceColumnDefinition>;
}
export class TypedSourceListFactory extends SourceListFactory {
  private readonly additionalColumns?: Array<V1CustomResourceColumnDefinition>;

  constructor({ sources, additionalColumns, factoryMetadata }: TypedSourceListParamters) {
    super({ sources, factoryMetadata })
    this.additionalColumns = additionalColumns
  }

  toComponent(): Component<TableConfig> {
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = (this.additionalColumns) ? this.additionalColumns.reduce((acc: string[], cur) =>
      cur.name.match(/Name|Sink|Age|Ready|Reason/) ? acc : acc.concat(cur.name),
      ['Name'],
    ).concat('Sink', 'Age')
      :
      ['Name', 'Sink', 'Age']

    table.emptyContent = "There are no sources!";
    // TODO add filters
    // table.filters = ...;

    const notFound = new TextFactory({ value: '*not found*', options: { isMarkdown: true } });
    for (const source of this.sources) {
      const { kind, metadata, spec, status } = source;
      const { sink } = spec;

      // const rowData = this.additionalColumns.reduce((acc, cur) => {
      //   Object.defineProperty(acc, cur.name, cur.name)
      //   return acc
      // }, {})
    }

    return table.getFactory().toComponent();
  }
}

interface SourceDetailParameters {
  source: Source;
  factoryMetadata?: FactoryMetadata;
}

export class SourceSummaryFactory implements ComponentFactory<any> {
  private readonly source: Source;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ source, factoryMetadata }: SourceDetailParameters) {
    this.source = source;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<any> {
    const layout = new FlexLayoutFactory({
      options: {
        sections: [
          [
            { view: this.toSpecComponent(), width: h.Width.Full },
            // { view: this.toStatusComponent(), width: h.Width.Full },
          ],
        ],
      },
      factoryMetadata: this.factoryMetadata,
    });
    return layout.toComponent();
  }

  toSpecComponent(): Component<any> {
    const { metadata, spec } = this.source;
    const sink = spec.sink

    const sections: ({ header: string; content: Component<any> })[] = [];

    const summary = new SummaryFactory({
      sections,
      factoryMetadata: {
        title: [new TextFactory({ value: "Spec" }).toComponent()],
      }
    })

    return summary.toComponent();
  };
}
