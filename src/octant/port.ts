/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

import { ButtonGroupConfig } from './button-group';

export interface PortConfig {
  port?: number;
  protocol?: string;
  targetPort?: number;
  targetPortName?: string;
  state?: {
    isForwardable?: boolean;
    isForwarded?: boolean;
    port?: number;
    id?: string;
  };
  buttonGroup?: Component<ButtonGroupConfig>;
}

export interface PortOptions {
  port?: number;
  protocol?: string;
  targetPort?: number;
  targetPortName?: string;
  state?: {
    isForwardable?: boolean;
    isForwarded?: boolean;
    port?: number;
    id?: string;
  };
  buttonGroup?: Component<ButtonGroupConfig>;
}

interface PortParameters {
  options?: PortOptions;
  factoryMetadata?: FactoryMetadata;
}

export class PortFactory implements ComponentFactory<PortConfig> {
  private readonly port: number | undefined;
  private readonly protocol: string | undefined;
  private readonly targetPort: number | undefined;
  private readonly targetPortName: string | undefined;
  private readonly state:
    | {
        isForwardable?: boolean;
        isForwarded?: boolean;
        port?: number;
        id?: string;
      }
    | undefined;
  private readonly buttonGroup: Component<ButtonGroupConfig> | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: PortParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.port = options.port;
      this.protocol = options.protocol;
      this.targetPort = options.targetPort;
      this.targetPortName = options.targetPortName;
      this.state = options.state;
      this.buttonGroup = options.buttonGroup;
    }
  }

  toComponent(): Component<PortConfig> {
    return {
      metadata: {
        type: 'port',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.port && { port: this.port }),
        ...(this.protocol && { protocol: this.protocol }),
        ...(this.targetPort && { targetPort: this.targetPort }),
        ...(this.targetPortName && { targetPortName: this.targetPortName }),
        ...(this.state && { state: this.state }),
        ...(this.buttonGroup && { buttonGroup: this.buttonGroup }),
      },
    };
  }
}
