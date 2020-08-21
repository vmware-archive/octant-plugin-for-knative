/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface ExpressionSelectorConfig {
  key: string;
  operator: string;
  values: string[];
}

interface ExpressionSelectorParameters {
  key: string;
  operator: string;
  values: string[];
  factoryMetadata?: FactoryMetadata;
}

export class ExpressionSelectorFactory
  implements ComponentFactory<ExpressionSelectorConfig> {
  private readonly key: string;
  private readonly operator: string;
  private readonly values: string[];
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({
    key,
    operator,
    values,
    factoryMetadata,
  }: ExpressionSelectorParameters) {
    this.key = key;
    this.operator = operator;
    this.values = values;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<ExpressionSelectorConfig> {
    return {
      metadata: {
        type: 'expressionSelector',
        ...this.factoryMetadata,
      },
      config: {
        key: this.key,
        operator: this.operator,
        values: this.values,
      },
    };
  }
}
