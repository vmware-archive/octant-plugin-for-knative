/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface CodeConfig {
  value: string;
}

interface CodeParameters {
  value: string;
  factoryMetadata?: FactoryMetadata;
}

export class CodeFactory implements ComponentFactory<CodeConfig> {
  private readonly value: string;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ value, factoryMetadata }: CodeParameters) {
    this.value = value;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<CodeConfig> {
    return {
      metadata: {
        type: 'codeBlock',
        ...this.factoryMetadata,
      },
      config: {
        value: this.value,
      },
    };
  }
}
