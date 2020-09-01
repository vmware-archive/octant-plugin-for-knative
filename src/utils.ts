/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectReference } from "@kubernetes/client-node";
import { ComponentFactory } from "./octant/component-factory";

export const ServingV1 = "serving.knative.dev/v1";
export const ServingV1Service = "Service";
export const ServingV1Configuration = "Configuration";
export const ServingV1Revision = "Revision";
export const ServingV1Route = "Route";

interface GridAction {
  name: string;
  actionPath: string;
  payload: { [key: string]: any };
  confirmation?: {
    title: string;
    body: string;
  };
  type: string;
}

export function deleteGridAction(obj: any): GridAction {
  return {
    name: "Delete",
    actionPath: "action.octant.dev/deleteObject",
    payload: {
      apiVersion: obj.apiVersion,
      kind: obj.kind,
      namespace: obj.metadata.namespace,
      name: obj.metadata.name,
    },
    confirmation: {   
      title: `Delete ${obj.kind}`,
      body: `Are you sure you want to delete *${obj.kind}* **${obj.metadata.name}**? This action is permanent and cannot be recovered.`,
    },
    type: "danger",
  };
}

export function knativeLinker(linker: (ref: V1ObjectReference) => string, ref: V1ObjectReference, context?: V1ObjectReference): string {
  if (!ref.apiVersion?.startsWith("serving.knative.dev/")) {
    return linker(ref);
  }
  return [context, ref].reduce((contentPath: string, ref: V1ObjectReference | undefined) => {
    if (!ref) {
      return contentPath;
    }
    if (ref.kind) {
      contentPath = `${contentPath}/${ref.kind?.toLowerCase()}s`;
    }
    if (ref.name) {
      contentPath = `${contentPath}/${ref.name}`;
    }
    return contentPath;
  }, "/knative");
}
