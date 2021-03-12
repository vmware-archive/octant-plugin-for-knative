/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";
import ctx from "../context";

import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { TextFactory } from "@project-octant/plugin/components/text";
import { LinkFactory } from "@project-octant/plugin/components/link";

export interface KReference {
  kind: string;
  namespace?: string;
  name: string;
  apiVersion: string;
}

interface KReferenceTableParameters {
  kreference: KReference;
  factoryMetadata?: FactoryMetadata;
}

export class KReferenceTableFactory implements ComponentFactory<any> {
  private readonly kreference: KReference;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ kreference, factoryMetadata }: KReferenceTableParameters) {
    this.kreference = kreference;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<any> {
    const ref = this.kreference

    const columns = {
      key: 'Key',
      value: 'Value'
    }
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.title = [new TextFactory({ value: "Ref" })]
    table.columns = [
      columns.key,
      columns.value,
    ];

    ref.namespace = ref.namespace || ctx.namespace
    const kind = new h.TableRow(
      {
        [columns.key]: new TextFactory({ value: "kind" }),
        [columns.value]: new TextFactory({ value: ref.kind })
      }
    )
    const namespace = new h.TableRow(
      {
        [columns.key]: new TextFactory({ value: "namespace" }),
        [columns.value]: new TextFactory({ value: ref.namespace })
      }
    )

    const name = new h.TableRow(
      {
        [columns.key]: new TextFactory({ value: "name" }),
        [columns.value]: new LinkFactory({ value: ref.name, ref: ctx.linker(ref) })
      }
    )
    const apiVersion = new h.TableRow(
      {
        [columns.key]: new TextFactory({ value: "apiVersion" }),
        [columns.value]: new TextFactory({ value: ref.apiVersion })
      }
    )
    const resource = new h.TableRow(
      {
        [columns.key]: new TextFactory({ value: "resource" }),
      }
    )
    table.push(name);
    table.push(kind);
    table.push(namespace);
    table.push(apiVersion);

    return table.getFactory().toComponent();
  }

}