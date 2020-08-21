/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface PodStatusConfig {
  pods?: {
    [key: string]: {
      details?: Component<any>[];
      status?: string;
    };
  };
}

export interface PodStatusOptions {
  pods?: {
    [key: string]: {
      details?: Component<any>[];
      status?: string;
    };
  };
}

interface PodStatusParameters {
  options?: PodStatusOptions;
  factoryMetadata?: FactoryMetadata;
}

export class PodStatusFactory implements ComponentFactory<PodStatusConfig> {
  private readonly pods:
    | {
        [key: string]: {
          details?: Component<any>[];
          status?: string;
        };
      }
    | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: PodStatusParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.pods = options.pods;
    }
  }

  toComponent(): Component<PodStatusConfig> {
    return {
      metadata: {
        type: 'podStatus',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.pods && { pods: this.pods }),
      },
    };
  }
}
