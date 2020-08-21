/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface StepperConfig {
  action: string;
  steps: {
    name: string;
    form: {
      fields: any[];
    };
    title: string;
    description: string;
  }[];
}

interface StepperParameters {
  action: string;
  steps: {
    name: string;
    form: {
      fields: any[];
    };
    title: string;
    description: string;
  }[];
  factoryMetadata?: FactoryMetadata;
}

export class StepperFactory implements ComponentFactory<StepperConfig> {
  private readonly action: string;
  private readonly steps: {
    name: string;
    form: {
      fields: any[];
    };
    title: string;
    description: string;
  }[];
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ action, steps, factoryMetadata }: StepperParameters) {
    this.action = action;
    this.steps = steps;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<StepperConfig> {
    return {
      metadata: {
        type: 'stepper',
        ...this.factoryMetadata,
      },
      config: {
        action: this.action,
        steps: this.steps,
      },
    };
  }
}
