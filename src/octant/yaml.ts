/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface YAMLConfig {
  data?: string;
}

export interface YAMLOptions {
  data?: string;
}

interface YAMLParameters {
  options?: YAMLOptions;
  factoryMetadata?: FactoryMetadata;
}

export class YAMLFactory implements ComponentFactory<YAMLConfig> {
  private readonly data: string | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: YAMLParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.data = options.data;
    }
  }

  toComponent(): Component<YAMLConfig> {
    return {
      metadata: {
        type: 'yaml',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.data && { data: this.data }),
      },
    };
  }
}
