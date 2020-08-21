/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface LabelSelectorConfig {
  key: string;
  value: string;
}

interface LabelSelectorParameters {
  key: string;
  value: string;
  factoryMetadata?: FactoryMetadata;
}

export class LabelSelectorFactory
  implements ComponentFactory<LabelSelectorConfig> {
  private readonly key: string;
  private readonly value: string;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ key, value, factoryMetadata }: LabelSelectorParameters) {
    this.key = key;
    this.value = value;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<LabelSelectorConfig> {
    return {
      metadata: {
        type: 'labelSelector',
        ...this.factoryMetadata,
      },
      config: {
        key: this.key,
        value: this.value,
      },
    };
  }
}
