/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


import { V1ObjectMeta } from "@kubernetes/client-node";
import { Condition } from "../components/conditions";
import { KReference } from "../components/kreference";

export const EventingV1 = "eventing.knative.dev/v1"
export const EventingV1Broker = "Broker"
export const EventingV1Trigger = "Trigger"
export const SourcesV1 = "sources.knative.dev/v1"

export interface Source {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    sink: {
      ref?: KReference;
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

export interface Broker {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    config?: KReference;
    delivery?: {
      deadLetterSink: {
        ref?: KReference;
        uri?: string;
      }
      retry?: number;
      backoffPolicy?: string;
      backoffDelay?: string;
    }
  }
  status: {
    conditions?: Condition[];
    observedGeneration: number;
    annotations?: { [key: string]: string };
    address: { url: string };
  };
}

// duckV1 Destination should be a interface.
export interface Trigger {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    broker: string;
    filter?: {
      attributes?: {[key: string]: string};
    };
    subscriber: {
      ref?: KReference;
      uri?: string;
    }
  }
  status: {
    conditions?: Condition[];
    observedGeneration: number;
    annotations?: { [key: string]: string };
    //confused on this what an apis.URL is, probably imported? copying broker behavior for now
    subscriberURI: { url: string }; 
  };
}