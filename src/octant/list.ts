/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface ListConfig {
  items: Component<any>[];
}

interface ListParameters {
  items: Component<any>[];
  factoryMetadata?: FactoryMetadata;
}

export class ListFactory implements ComponentFactory<ListConfig> {
  private readonly items: Component<any>[];
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ items, factoryMetadata }: ListParameters) {
    this.items = items;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<ListConfig> {
    return {
      metadata: {
        type: 'list',
        ...this.factoryMetadata,
      },
      config: {
        items: this.items,
      },
    };
  }
}
