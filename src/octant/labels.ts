/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface LabelsConfig {
  labels: { [key: string]: string };
}

interface LabelsParameters {
  labels: { [key: string]: string };
  factoryMetadata?: FactoryMetadata;
}

export class LabelsFactory implements ComponentFactory<LabelsConfig> {
  private readonly labels: { [key: string]: string };
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ labels, factoryMetadata }: LabelsParameters) {
    this.labels = labels;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<LabelsConfig> {
    return {
      metadata: {
        type: 'labels',
        ...this.factoryMetadata,
      },
      config: {
        labels: this.labels,
      },
    };
  }
}
