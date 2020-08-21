/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface GraphvizConfig {
  dot?: string;
}

export interface GraphvizOptions {
  dot?: string;
}

interface GraphvizParameters {
  options?: GraphvizOptions;
  factoryMetadata?: FactoryMetadata;
}

export class GraphvizFactory implements ComponentFactory<GraphvizConfig> {
  private readonly dot: string | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: GraphvizParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.dot = options.dot;
    }
  }

  toComponent(): Component<GraphvizConfig> {
    return {
      metadata: {
        type: 'graphviz',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.dot && { dot: this.dot }),
      },
    };
  }
}
