/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface ErrorConfig {
  data?: string;
}

export interface ErrorOptions {
  data?: string;
}

interface ErrorParameters {
  options?: ErrorOptions;
  factoryMetadata?: FactoryMetadata;
}

export class ErrorFactory implements ComponentFactory<ErrorConfig> {
  private readonly data: string | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: ErrorParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.data = options.data;
    }
  }

  toComponent(): Component<ErrorConfig> {
    return {
      metadata: {
        type: 'error',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.data && { data: this.data }),
      },
    };
  }
}
