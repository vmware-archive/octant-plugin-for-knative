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
import { V1CustomResourceDefinition } from "@kubernetes/client-node";
import { EventingSourceV1, Source } from "./eventing/api";
import { SourceListFactory, SourceSummaryFactory, TypedSourceListFactory } from "./eventing/source";
import {
  ClusterDuckType,
  ClusterDuckTypeListFactory,
  DiscoveryV1Alpha,
  DiscoveryV1AlphaClusterDuckType,
  ResourceMeta,
  SourcesDuck,
} from "./components/discovery";

export function sourcesListingContentHandler(params: any): octant.ContentResponse {


  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Eventing", ref: ctx.linker({ apiVersion: EventingSourceV1 }) }),
    new TextFactory({ value: "Sources" })
  ];
  const body = new ListFactory({
    factoryMetadata: {
      title: title.map(f => f.toComponent()),
    },
    items: [
      sourceTypeListing(params.ClientID, {
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
    new LinkFactory({ value: "Eventing", ref: ctx.linker({ apiVersion: EventingSourceV1 }) }),
    new LinkFactory({ value: "Sources", ref: "/knative/eventing/sources" }),
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
    apiVersion: EventingSourceV1,
    kind: type,
    name: name,
    namespace: namespace,
  })

  const title = [
    new LinkFactory({ value: "Knative", ref: "/knative" }),
    new LinkFactory({ value: "Eventing", ref: ctx.linker({ apiVersion: EventingSourceV1 }) }),
    new LinkFactory({ value: "Sources", ref: "/knative/eventing/sources" }),
    new LinkFactory({ value: type, ref: `/knative/eventing/sources/${type}` }),
    new TextFactory({ value: name })
  ]

  const body = new SourceSummaryFactory({ source })
  return h.createContentResponse(title, [body])
}

function sourceTypeListing(clientID: string, factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
  const duckTypes: ClusterDuckType = ctx.dashboardClient.Get({
    apiVersion: DiscoveryV1Alpha,
    kind: DiscoveryV1AlphaClusterDuckType,
    name: SourcesDuck,
  })

  return new ClusterDuckTypeListFactory({ duckTypes, factoryMetadata })
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
function typedSourceListing(params: ({ clientID: string, sourceType: string }), factoryMetadata?: FactoryMetadata): ComponentFactory<any> {
  const { clientID, sourceType } = params

  const ducks: ClusterDuckType = ctx.dashboardClient.Get({
    apiVersion: DiscoveryV1Alpha,
    kind: DiscoveryV1AlphaClusterDuckType,
    name: SourcesDuck,
  })
  const { spec, status } = ducks

  const sourceTypeMeta: ResourceMeta = spec.versions.reduce((acc: ResourceMeta, cur) => {
    const meta = status.ducks[cur.name].find(d => d.kind === sourceType)
    return meta ? meta : acc
  }, { apiVersion: "", kind: "", scope: "" })
  const group: string = sourceTypeMeta.apiVersion.split("/")[0]
    // TODO: this is currently a guess and potentially risky
  const plural: string = sourceTypeMeta.kind.toLocaleLowerCase()+'s'

  const crd: V1CustomResourceDefinition = ctx.dashboardClient.Get({
    apiVersion: 'apiextensions.k8s.io/v1',
    kind: 'CustomResourceDefinition',
    name: `${plural}.${group}`,
  })

  const latest = crd.spec.versions[crd.spec.versions.length - 1]
  const additionalColumns = latest?.additionalPrinterColumns
  var sources: Source[] = []

  return new TypedSourceListFactory({ sources, additionalColumns, factoryMetadata })
}