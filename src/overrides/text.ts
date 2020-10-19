/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from '@project-octant/plugin/components/component-factory';
import { Component } from '@project-octant/plugin/components/component';

export interface TextConfig {
  value: string;
  isMarkdown?: boolean;
  trustedContent?: boolean;
  status?: number;
}

export interface TextOptions {
  isMarkdown?: boolean;
  trustedContent?: boolean;
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
  private readonly trustedContent: boolean | undefined;
  private readonly status: number | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ value, options, factoryMetadata }: TextParameters) {
    this.value = value;
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.isMarkdown = options.isMarkdown;
      this.trustedContent = options.trustedContent;
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
        ...(this.trustedContent && { trustedContent: this.trustedContent }),
        ...(this.status && { status: this.status }),
      },
    };
  }
}
