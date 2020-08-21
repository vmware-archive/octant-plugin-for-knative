/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface SingleStatConfig {
  title: string;
  value: {
    text: string;
    color: string;
  };
}

interface SingleStatParameters {
  title: string;
  value: {
    text: string;
    color: string;
  };
  factoryMetadata?: FactoryMetadata;
}

export class SingleStatFactory implements ComponentFactory<SingleStatConfig> {
  private readonly title: string;
  private readonly value: {
    text: string;
    color: string;
  };
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ title, value, factoryMetadata }: SingleStatParameters) {
    this.title = title;
    this.value = value;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<SingleStatConfig> {
    return {
      metadata: {
        type: 'singleStat',
        ...this.factoryMetadata,
      },
      config: {
        title: this.title,
        value: this.value,
      },
    };
  }
}
