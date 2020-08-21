/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface AnnotationsConfig {
  annotations: { [key: string]: string };
}

interface AnnotationsParameters {
  annotations: { [key: string]: string };
  factoryMetadata?: FactoryMetadata;
}

export class AnnotationsFactory implements ComponentFactory<AnnotationsConfig> {
  private readonly annotations: { [key: string]: string };
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ annotations, factoryMetadata }: AnnotationsParameters) {
    this.annotations = annotations;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<AnnotationsConfig> {
    return {
      metadata: {
        type: 'annotations',
        ...this.factoryMetadata,
      },
      config: {
        annotations: this.annotations,
      },
    };
  }
}
