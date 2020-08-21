/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface TextConfig {
  value: string;
  isMarkdown?: boolean;
  status?: number;
}

export interface TextOptions {
  isMarkdown?: boolean;
  status?: number;
}

interface TextParameters {
  value: string;
  options?: TextOptions;
  factoryMetadata?: FactoryMetadata;
}

export class TextFactory implements ComponentFactory<TextConfig> {
  private readonly value: string;
  private readonly isMarkdown: boolean | undefined;
  private readonly status: number | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ value, options, factoryMetadata }: TextParameters) {
    this.value = value;
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.isMarkdown = options.isMarkdown;
      this.status = options.status;
    }
  }

  toComponent(): Component<TextConfig> {
    return {
      metadata: {
        type: 'text',
        ...this.factoryMetadata,
      },
      config: {
        value: this.value,

        ...(this.isMarkdown && { isMarkdown: this.isMarkdown }),
        ...(this.status && { status: this.status }),
      },
    };
  }
}
