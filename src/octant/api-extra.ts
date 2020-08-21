import { DashboardClient } from '../octant/plugin';
import { Component } from './component';
import { LinkConfig, LinkFactory } from './link';

export interface Ref {
  apiVersion: string;
  kind: string;
  name: string;
  namespace: string;
}

export const genLinkFromObject = (
  object: any,
  client: DashboardClient
): Component<LinkConfig> => {
  const ref: Ref = {
    namespace: object.metadata.namespace,
    apiVersion: object.apiVersion,
    kind: object.kind,
    name: object.metadata.name,
  };

  return genLink(ref, client);
};

export const genLink = (
  ref: Ref,
  client: DashboardClient
): Component<LinkConfig> => {
  const path = client.RefPath(ref);
  return new LinkFactory({ value: ref.name, ref: path }).toComponent();
};