/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface LoadingConfig {
  value: string;
}

interface LoadingParameters {
  value: string;
  factoryMetadata?: FactoryMetadata;
}

export class LoadingFactory implements ComponentFactory<LoadingConfig> {
  private readonly value: string;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ value, factoryMetadata }: LoadingParameters) {
    this.value = value;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<LoadingConfig> {
    return {
      metadata: {
        type: 'loading',
        ...this.factoryMetadata,
      },
      config: {
        value: this.value,
      },
    };
  }
}
