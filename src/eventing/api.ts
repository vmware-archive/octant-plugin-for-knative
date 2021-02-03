/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


import { V1ObjectMeta } from "@kubernetes/client-node";
import { Condition } from "../components/conditions";

export const EventingSourceV1 = "sources.knative.dev/v1beta2"

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
  };
  status: {
    conditions?: Condition[];
    observedGeneration: number;
  };
}