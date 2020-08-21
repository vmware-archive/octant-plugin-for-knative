/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface CardConfig {
  body: Component<any>;
  actions?: {
    name: string;
    title: string;
    form: {
      fields: any[];
    };
    modal: boolean;
  }[];
  alert?: {
    type: string;
    message: string;
  };
}

export interface CardOptions {
  actions?: {
    name: string;
    title: string;
    form: {
      fields: any[];
    };
    modal: boolean;
  }[];
  alert?: {
    type: string;
    message: string;
  };
}

interface CardParameters {
  body: Component<any>;
  options?: CardOptions;
  factoryMetadata?: FactoryMetadata;
}

export class CardFactory implements ComponentFactory<CardConfig> {
  private readonly body: Component<any>;
  private readonly actions:
    | {
        name: string;
        title: string;
        form: {
          fields: any[];
        };
        modal: boolean;
      }[]
    | undefined;
  private readonly alert:
    | {
        type: string;
        message: string;
      }
    | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ body, options, factoryMetadata }: CardParameters) {
    this.body = body;
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.actions = options.actions;
      this.alert = options.alert;
    }
  }

  toComponent(): Component<CardConfig> {
    return {
      metadata: {
        type: 'card',
        ...this.factoryMetadata,
      },
      config: {
        body: this.body,

        ...(this.actions && { actions: this.actions }),
        ...(this.alert && { alert: this.alert }),
      },
    };
  }
}
