/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import YAML from "yaml";

// plugin contains interfaces your plugin can expect
// this includes your main plugin class, response, requests, and clients.
import * as octant from "@project-octant/plugin";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { ListFactory } from "@project-octant/plugin/components/list";
import { TextFactory } from "@project-octant/plugin/components/text";

import ctx from "./context";
import { V1CustomResourceDefinition, V1ObjectReference } from "@kubernetes/client-node";
import { EventingV1, Source, SourcesV1 } from "./eventing/api";
import { SourceListFactory, SourceSummaryFactory, TypedSourceListFactory } from "./eventing/source";
import {
  ClusterDuckType,
  ClusterDuckTypeTableFactory,
  DiscoveryV1Alpha,
  DiscoveryV1AlphaClusterDuckType,
  ResourceMeta,
  SourcesDuck,
} from "./components/discovery";
import { MetadataSummaryFactory } from "./components/metadata";
import { EditorFactory } from "@project-octant/plugin/components/editor";

export function sourcesListingContentHandler(params: any): octant.ContentResponse {


  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Eventing", ref: ctx.linker({ apiVersion: EventingV1 }) }),
    new TextFactory({ value: "Sources" })
  ];
  const body = new ListFactory({
    factoryMetadata: {
      title: title.map(f => f.toComponent()),
    },
    items: [
      sourceTypeListing({
        title: [new TextFactory({ value: "Source Types" }).toComponent()]
      }).toComponent(),
      sourceListing(params.ClientID, {
        title: [new TextFactory({ value: "Sources" }).toComponent()]
      }).toComponent(),
    ],
  });
  return h.createContentResponse(title, [body]);
}

export function sourceTypeListingContentHandler(params: any): octant.ContentResponse {
  const name: string = params.sourceType;

  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Eventing", ref: ctx.linker({ apiVersion: EventingV1 }) }),
    new LinkFactory({ value: "Sources", ref: ctx.linker({ apiVersion: SourcesV1 }) }),
    new TextFactory({ value: name })
  ];
  const body = new ListFactory({
    factoryMetadata: {
      title: title.map(f => f.toComponent()),
    },
    items: [
      sourceListing(params.ClientID, {
        title: [new TextFactory({ value: "Sources" }).toComponent()]
      }, name).toComponent(),
    ],
  });
  return h.createContentResponse(title, [body]);
}

export function sourceDetailContentHandler(params: any): octant.ContentResponse {
  const namespace: string = params.namespace || ctx.namespace
  const name: string = params.sourceName;
  const type: string = params.sourceType;

  const source: Source = ctx.dashboardClient.Get({
    apiVersion: SourcesV1,
    kind: type,
    name: name,
    namespace: namespace,
  })

  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Eventing", ref: ctx.linker({ apiVersion: EventingV1 }) }),
    new LinkFactory({ value: "Sources", ref: ctx.linker({ apiVersion: SourcesV1 }) }),
    new LinkFactory({ value: type, ref: ctx.linker({ apiVersion: SourcesV1, name: type }) }),
    new TextFactory({ value: name })
  ]

  const body = sourceDetail(source)
  return h.createContentResponse(title, body)
}

function sourceTypeListing(factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
  const duckTypes: ClusterDuckType = ctx.dashboardClient.Get({
    apiVersion: DiscoveryV1Alpha,
    kind: DiscoveryV1AlphaClusterDuckType,
    name: SourcesDuck,
  })
  const ref: V1ObjectReference = {apiVersion: SourcesV1}

  return new ClusterDuckTypeTableFactory({ duckTypes, ref, factoryMetadata })
}

// TODO: Simplify logic/ extract functions/methods
function sourceListing(clientID: string, factoryMetadata?: FactoryMetadata, sourceType?: string): ComponentFactory<any> {
  const sourceDucks: ClusterDuckType = ctx.dashboardClient.Get({
    apiVersion: DiscoveryV1Alpha,
    kind: DiscoveryV1AlphaClusterDuckType,
    name: SourcesDuck,
  })
  const { spec, status } = sourceDucks

  const sourceMetas: ResourceMeta[] = spec.versions.reduce((acc: ResourceMeta[], cur) =>
    acc.concat(status.ducks[cur.name]),
    [])
  sourceMetas.sort((a, b) => (a.kind.localeCompare(b.kind)))

  const allSources: Source[] = sourceMetas.reduce((acc: Source[], cur) => {
    if (!sourceType || cur.kind === sourceType) {
      return acc.concat(ctx.dashboardClient.List({
        apiVersion: cur.apiVersion,
        kind: cur.kind,
        namespace: ctx.namespace,
      }))
    }
    return acc
  }, [])

  const sources: Source[] = allSources.reduce((acc: Source[], cur) =>
    acc.find((s) => s.metadata.uid === cur.metadata.uid) ? acc : acc.concat(cur),
    [])
  sources.sort((a, b) => (a.metadata.name || '').localeCompare(b.metadata.name || ''));

  return new SourceListFactory({ sources, factoryMetadata })
}

//TODO: Finish implementing the usage of `additional printer columns` passing in sources
function typedSourceListing(sourceType: string, factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
  const ducks: ClusterDuckType = ctx.dashboardClient.Get({
    apiVersion: DiscoveryV1Alpha,
    kind: DiscoveryV1AlphaClusterDuckType,
    name: SourcesDuck,
  })
  const { spec, status } = ducks

  const sourceMetas: ResourceMeta[] = spec.versions.reduce((acc: ResourceMeta[], cur) =>
    acc.concat(status.ducks[cur.name]),
    [])
  const sourceTypeMeta: ResourceMeta | undefined = sourceMetas.find(d => d.kind === sourceType)

  const group: string = sourceTypeMeta?.apiVersion.split("/")[0] || "nogroup"
  // TODO: this is currently a guess and potentially risky
  const plural: string = sourceTypeMeta?.kind.toLocaleLowerCase() + 's' || "noname"

  const crd: V1CustomResourceDefinition = ctx.dashboardClient.Get({
    apiVersion: 'apiextensions.k8s.io/v1',
    kind: 'CustomResourceDefinition',
    name: `${plural}.${group}`,
  })

  const stored = crd.spec.versions.find(v => v.storage)
  const additionalColumns = stored?.additionalPrinterColumns
  var sources: Source[] = []

  return new TypedSourceListFactory({ sources, additionalColumns, factoryMetadata })
}

function sourceDetail(source: Source): ComponentFactory<any>[] {
  return [
    new SourceSummaryFactory({
      source,
      factoryMetadata: {
        title: [new TextFactory({ value: "Summary" }).toComponent()],
        accessor: "summary",
      },
    }),
    new MetadataSummaryFactory({
      object: source,
      factoryMetadata: {
        title: [new TextFactory({ value: "Metadata" }).toComponent()],
        accessor: "metadata",
      }
    }),
    new EditorFactory({
      value: "---\n" + YAML.stringify(JSON.parse(JSON.stringify(source)), { sortMapEntries: true }),
      language: 'yaml',
      readOnly: false,
      metadata: {
        apiVersion: source.apiVersion,
        kind: source.kind,
        namespace: source.metadata.namespace || '',
        name: source.metadata.name || '',
      },
      factoryMetadata: {
        title: [new TextFactory({ value: "YAML" }).toComponent()],
        accessor: "yaml",
      },
    })

  ]
}
