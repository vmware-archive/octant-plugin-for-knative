/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

import { ButtonGroupConfig } from './button-group';

export interface FlexLayoutConfig {
  sections?: {
    width?: number;
    view?: Component<any>;
  }[][];
  buttonGroup?: Component<ButtonGroupConfig>;
}

export interface FlexLayoutOptions {
  sections?: {
    width?: number;
    view?: Component<any>;
  }[][];
  buttonGroup?: Component<ButtonGroupConfig>;
}

interface FlexLayoutParameters {
  options?: FlexLayoutOptions;
  factoryMetadata?: FactoryMetadata;
}

export class FlexLayoutFactory implements ComponentFactory<FlexLayoutConfig> {
  private readonly sections:
    | {
        width?: number;
        view?: Component<any>;
      }[][]
    | undefined;
  private readonly buttonGroup: Component<ButtonGroupConfig> | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: FlexLayoutParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.sections = options.sections;
      this.buttonGroup = options.buttonGroup;
    }
  }

  toComponent(): Component<FlexLayoutConfig> {
    return {
      metadata: {
        type: 'flexlayout',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.sections && { sections: this.sections }),
        ...(this.buttonGroup && { buttonGroup: this.buttonGroup }),
      },
    };
  }
}
