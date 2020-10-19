/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as octant from "@project-octant/plugin";

import { V1ObjectReference } from "@kubernetes/client-node";

export type linker = (ref: V1ObjectReference, context?: V1ObjectReference) => string;

export function knativeLinker(linker: (ref: octant.Ref) => string, ref: V1ObjectReference, context?: V1ObjectReference): string {
  if (!ref.apiVersion?.startsWith("serving.knative.dev/")) {
    return linker(ref as octant.Ref);
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
  }, "/knative/serving");
}
