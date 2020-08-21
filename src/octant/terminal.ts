/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface TerminalConfig {
  namespace: string;
  name: string;
  podName: string;
  containers: string[];
  terminal: {
    container: string;
    command: string;
    createdAt: number;
    active: boolean;
  };
}

interface TerminalParameters {
  namespace: string;
  name: string;
  podName: string;
  containers: string[];
  terminal: {
    container: string;
    command: string;
    createdAt: number;
    active: boolean;
  };
  factoryMetadata?: FactoryMetadata;
}

export class TerminalFactory implements ComponentFactory<TerminalConfig> {
  private readonly namespace: string;
  private readonly name: string;
  private readonly podName: string;
  private readonly containers: string[];
  private readonly terminal: {
    container: string;
    command: string;
    createdAt: number;
    active: boolean;
  };
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({
    namespace,
    name,
    podName,
    containers,
    terminal,
    factoryMetadata,
  }: TerminalParameters) {
    this.namespace = namespace;
    this.name = name;
    this.podName = podName;
    this.containers = containers;
    this.terminal = terminal;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<TerminalConfig> {
    return {
      metadata: {
        type: 'terminal',
        ...this.factoryMetadata,
      },
      config: {
        namespace: this.namespace,
        name: this.name,
        podName: this.podName,
        containers: this.containers,
        terminal: this.terminal,
      },
    };
  }
}
