/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface ExtensionConfig {
  tabs: {
    tab: Component<any>;
    payload?: { [key: string]: any };
  }[];
}

interface ExtensionParameters {
  tabs: {
    tab: Component<any>;
    payload?: { [key: string]: any };
  }[];
  factoryMetadata?: FactoryMetadata;
}

export class ExtensionFactory implements ComponentFactory<ExtensionConfig> {
  private readonly tabs: {
    tab: Component<any>;
    payload?: { [key: string]: any };
  }[];
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ tabs, factoryMetadata }: ExtensionParameters) {
    this.tabs = tabs;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<ExtensionConfig> {
    return {
      metadata: {
        type: 'extension',
        ...this.factoryMetadata,
      },
      config: {
        tabs: this.tabs,
      },
    };
  }
}
