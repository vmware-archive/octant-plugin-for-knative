/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface SummaryConfig {
  sections: {
    header: string;
    content: Component<any>;
  }[];
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

export interface SummaryOptions {
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

interface SummaryParameters {
  sections: {
    header: string;
    content: Component<any>;
  }[];
  options?: SummaryOptions;
  factoryMetadata?: FactoryMetadata;
}

export class SummaryFactory implements ComponentFactory<SummaryConfig> {
  private readonly sections: {
    header: string;
    content: Component<any>;
  }[];
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

  constructor({ sections, options, factoryMetadata }: SummaryParameters) {
    this.sections = sections;
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.actions = options.actions;
      this.alert = options.alert;
    }
  }

  toComponent(): Component<SummaryConfig> {
    return {
      metadata: {
        type: 'summary',
        ...this.factoryMetadata,
      },
      config: {
        sections: this.sections,

        ...(this.actions && { actions: this.actions }),
        ...(this.alert && { alert: this.alert }),
      },
    };
  }
}
