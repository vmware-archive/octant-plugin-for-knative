/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


import { V1ObjectMeta } from "@kubernetes/client-node";
import { Condition } from "../components/conditions";

export const EventingV1 = "eventing.knative.dev/v1"
export const SourcesV1 = "sources.knative.dev/v1"

export interface Source {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    sink: {
      ref?: {
        kind: string;
        namespace?: string;
        name: string;
        apiVersion: string;
      }
      uri?: string;
    };
    ceOverrides?: {
      extensions: { [key: string]: string };
    }
  };
  status: {
    conditions?: Condition[];
    observedGeneration: number;
    ceAttributes: { type: string; source: string; }[];
    sinkURI?: string;
  };
}
