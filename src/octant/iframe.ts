/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface IFrameConfig {
  url: string;
  title: string;
}

interface IFrameParameters {
  url: string;
  title: string;
  factoryMetadata?: FactoryMetadata;
}

export class IFrameFactory implements ComponentFactory<IFrameConfig> {
  private readonly url: string;
  private readonly title: string;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ url, title, factoryMetadata }: IFrameParameters) {
    this.url = url;
    this.title = title;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<IFrameConfig> {
    return {
      metadata: {
        type: 'iframe',
        ...this.factoryMetadata,
      },
      config: {
        url: this.url,
        title: this.title,
      },
    };
  }
}
