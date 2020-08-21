/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface GridActionsConfig {
  actions: {
    name: string;
    actionPath: string;
    payload: { [key: string]: any };
    confirmation?: {
      title: string;
      body: string;
    };
    type: string;
  }[];
}

interface GridActionsParameters {
  actions: {
    name: string;
    actionPath: string;
    payload: { [key: string]: any };
    confirmation?: {
      title: string;
      body: string;
    };
    type: string;
  }[];
  factoryMetadata?: FactoryMetadata;
}

export class GridActionsFactory implements ComponentFactory<GridActionsConfig> {
  private readonly actions: {
    name: string;
    actionPath: string;
    payload: { [key: string]: any };
    confirmation?: {
      title: string;
      body: string;
    };
    type: string;
  }[];
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ actions, factoryMetadata }: GridActionsParameters) {
    this.actions = actions;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<GridActionsConfig> {
    return {
      metadata: {
        type: 'gridActions',
        ...this.factoryMetadata,
      },
      config: {
        actions: this.actions,
      },
    };
  }
}
