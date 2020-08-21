/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface LogsConfig {
  namespace?: string;
  name?: string;
  containers?: string[];
}

export interface LogsOptions {
  namespace?: string;
  name?: string;
  containers?: string[];
}

interface LogsParameters {
  options?: LogsOptions;
  factoryMetadata?: FactoryMetadata;
}

export class LogsFactory implements ComponentFactory<LogsConfig> {
  private readonly namespace: string | undefined;
  private readonly name: string | undefined;
  private readonly containers: string[] | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: LogsParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.namespace = options.namespace;
      this.name = options.name;
      this.containers = options.containers;
    }
  }

  toComponent(): Component<LogsConfig> {
    return {
      metadata: {
        type: 'logs',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.namespace && { namespace: this.namespace }),
        ...(this.name && { name: this.name }),
        ...(this.containers && { containers: this.containers }),
      },
    };
  }
}
