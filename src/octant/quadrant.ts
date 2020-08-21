/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface QuadrantConfig {
  nw?: {
    value?: string;
    label?: string;
  };
  ne?: {
    value?: string;
    label?: string;
  };
  se?: {
    value?: string;
    label?: string;
  };
  sw?: {
    value?: string;
    label?: string;
  };
}

export interface QuadrantOptions {
  nw?: {
    value?: string;
    label?: string;
  };
  ne?: {
    value?: string;
    label?: string;
  };
  se?: {
    value?: string;
    label?: string;
  };
  sw?: {
    value?: string;
    label?: string;
  };
}

interface QuadrantParameters {
  options?: QuadrantOptions;
  factoryMetadata?: FactoryMetadata;
}

export class QuadrantFactory implements ComponentFactory<QuadrantConfig> {
  private readonly nw:
    | {
        value?: string;
        label?: string;
      }
    | undefined;
  private readonly ne:
    | {
        value?: string;
        label?: string;
      }
    | undefined;
  private readonly se:
    | {
        value?: string;
        label?: string;
      }
    | undefined;
  private readonly sw:
    | {
        value?: string;
        label?: string;
      }
    | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: QuadrantParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.nw = options.nw;
      this.ne = options.ne;
      this.se = options.se;
      this.sw = options.sw;
    }
  }

  toComponent(): Component<QuadrantConfig> {
    return {
      metadata: {
        type: 'quadrant',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.nw && { nw: this.nw }),
        ...(this.ne && { ne: this.ne }),
        ...(this.se && { se: this.se }),
        ...(this.sw && { sw: this.sw }),
      },
    };
  }
}
