/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface SelectorsConfig {
  selectors: any[];
}

interface SelectorsParameters {
  selectors: any[];
  factoryMetadata?: FactoryMetadata;
}

export class SelectorsFactory implements ComponentFactory<SelectorsConfig> {
  private readonly selectors: any[];
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ selectors, factoryMetadata }: SelectorsParameters) {
    this.selectors = selectors;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<SelectorsConfig> {
    return {
      metadata: {
        type: 'selectors',
        ...this.factoryMetadata,
      },
      config: {
        selectors: this.selectors,
      },
    };
  }
}
