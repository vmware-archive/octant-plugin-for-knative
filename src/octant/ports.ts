/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

import { PortConfig } from './port';

export interface PortsConfig {
  ports?: Component<PortConfig>[];
}

export interface PortsOptions {
  ports?: Component<PortConfig>[];
}

interface PortsParameters {
  options?: PortsOptions;
  factoryMetadata?: FactoryMetadata;
}

export class PortsFactory implements ComponentFactory<PortsConfig> {
  private readonly ports: Component<PortConfig>[] | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: PortsParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.ports = options.ports;
    }
  }

  toComponent(): Component<PortsConfig> {
    return {
      metadata: {
        type: 'ports',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.ports && { ports: this.ports }),
      },
    };
  }
}
