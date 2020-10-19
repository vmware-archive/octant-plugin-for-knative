/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */


import { V1ObjectMeta, V1PodSpec, V1PodTemplateSpec } from "@kubernetes/client-node";
import { Condition } from "../components/conditions";

export const ServingV1 = "serving.knative.dev/v1";

export const ServingV1Service = "Service";
// TODO fully fresh out
export interface Service {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    template: V1PodTemplateSpec;
    traffic: TrafficPolicy[];
  };
  status: {
    conditions?: Condition[];
    url?: string;
    address?: {
      url?: string;
    };
    latestCreatedRevisionName?: string;
    latestReadyRevisionName?: string;
    traffic: TrafficPolicy[];
  };
}

export const ServingV1Configuration = "Configuration";
// TODO fully fresh out
export interface Configuration {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    template: V1PodTemplateSpec;
  };
  status: {
    conditions?: Condition[];
    latestCreatedRevisionName?: string;
    latestReadyRevisionName?: string;
  };
}

export const ServingV1Revision = "Revision";
// TODO fully fresh out
export interface Revision {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: V1PodSpec;
  status: {
    conditions?: Condition[];
    serviceName?: string;
    imageDigest?: string;
  };
}

export const ServingV1Route = "Route";
// TODO fully fresh out
export interface Route {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    traffic: TrafficPolicy[];
  };
  status: {
    conditions?: Condition[];
    address: {
      url?: string;
    };
    url?: string;
    traffic: TrafficPolicy[];
  };
}

export interface TrafficPolicy {
  tag?: string;
  revisionName?: string;
  configurationName?: string;
  latestRevision?: boolean;
  percent?: number;
  url?: string;
}


