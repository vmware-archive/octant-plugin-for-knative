/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

import { V1ObjectMeta } from "@kubernetes/client-node"
import { Component } from "@project-octant/plugin/components/component"
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory"
import { TextFactory } from "@project-octant/plugin/components/text";
import { LinkFactory } from "@project-octant/plugin/components/link";

export const DiscoveryV1Alpha = "discovery.knative.dev/v1alpha1"

export interface ResourceMeta {
  apiVersion: string;
  kind: string;
  scope: string;
}

export const DiscoveryV1AlphaClusterDuckType = "ClusterDuckType"
export interface ClusterDuckType {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    versions: Array<{ name: string; }>;
    names: {
      plural: string;
    }
  };
  status: {
    ducks: {
      [key: string]: ResourceMeta[];
    };
  };
}

export const SourcesDuck = "sources.duck.knative.dev"

interface ClusterDuckTypeListParameters {
  duckTypes: ClusterDuckType;
  factoryMetadata?: FactoryMetadata;
}

export class ClusterDuckTypeListFactory implements ComponentFactory<any> {
  private readonly duckTypes: ClusterDuckType;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ duckTypes, factoryMetadata }: ClusterDuckTypeListParameters) {
    this.duckTypes = duckTypes;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<any> {
    const { spec, status } = this.duckTypes
    const { versions } = spec
    const columns = {
      type: 'Type',
      version: 'API Version',
    }
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.type,
      columns.version,
    ];

    table.emptyContent = `There are no ${spec.names.plural}!`;
    // TODO: this should be handled externally
    const duckVersions = versions.reduce((acc: ResourceMeta[], cur) => acc.concat(status.ducks[cur.name]), [])
    duckVersions.sort((a, b) => apiVersionCompare(a.apiVersion, b.apiVersion))
    duckVersions.reverse()
    const sortedVersions = duckVersions.filter((val, idx, arr) => arr.findIndex(v => val.kind == v.kind) === idx)
    sortedVersions.sort((a, b) => a.kind.localeCompare(b.kind))

    for (const duck of sortedVersions) {
      const { apiVersion, kind } = duck

      const row = new h.TableRow({
        [columns.type]: new LinkFactory({
          value: kind,
          ref: `/knative/eventing/${spec.names.plural}/${kind}`
        }),
        [columns.version]: new TextFactory({ value: apiVersion })
      })

      table.push(row);
    }

    return table.getFactory().toComponent();
  }
}

function apiVersionCompare(a: string, b: string): number {
  const aLess = -1
  const bLess = 1

  const versionRegexp: RegExp = /v([1-9][0-9]*)(?:((?:alpha)|(?:beta))([1-9][0-9]*)?)?$/
  const aInfo = a.match(versionRegexp)
  const bInfo = b.match(versionRegexp)

  if (!aInfo && !bInfo) return a.localeCompare(b)
  if (!aInfo) return aLess
  if (!bInfo) return bLess

  const aVer = Number(aInfo[1])
  const bVer = Number(aInfo[1])
  if (aVer != bVer) return aVer - bVer

  const aTag = aInfo[2]
  const bTag = bInfo[2]
  if (!aTag && !bTag) return a.localeCompare(b)
  if (!aTag) return bLess
  if (!bTag) return aLess
  if (bTag === "alpha" && aTag === "beta") return bLess
  if (aTag === "alpha" && bTag === "beta") return aLess

  const aTagVer = Number(aInfo[3])
  const bTagVer = Number(bInfo[3])
  if (!aTagVer) return aLess
  if (!bTagVer) return bLess

  return aTagVer - bTagVer
}
