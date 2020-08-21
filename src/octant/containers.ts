/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface ContainersConfig {
  containers: {
    name: string;
    image: string;
  }[];
}

interface ContainersParameters {
  containers: {
    name: string;
    image: string;
  }[];
  factoryMetadata?: FactoryMetadata;
}

export class ContainersFactory implements ComponentFactory<ContainersConfig> {
  private readonly containers: {
    name: string;
    image: string;
  }[];
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ containers, factoryMetadata }: ContainersParameters) {
    this.containers = containers;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<ContainersConfig> {
    return {
      metadata: {
        type: 'containers',
        ...this.factoryMetadata,
      },
      config: {
        containers: this.containers,
      },
    };
  }
}
