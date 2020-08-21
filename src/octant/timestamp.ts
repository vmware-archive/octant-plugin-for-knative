/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface TimestampConfig {
  timestamp: number;
}

interface TimestampParameters {
  timestamp: number;
  factoryMetadata?: FactoryMetadata;
}

export class TimestampFactory implements ComponentFactory<TimestampConfig> {
  private readonly timestamp: number;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ timestamp, factoryMetadata }: TimestampParameters) {
    this.timestamp = timestamp;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<TimestampConfig> {
    return {
      metadata: {
        type: 'timestamp',
        ...this.factoryMetadata,
      },
      config: {
        timestamp: this.timestamp,
      },
    };
  }
}
