/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

import { LinkConfig } from './link';

export interface ResourceViewerConfig {
  edges?: {
    [key: string]: {
      node: string;
      edge: string;
    }[];
  };
  nodes?: {
    [key: string]: {
      name?: string;
      apiVersion?: string;
      kind?: string;
      status?: string;
      details?: Component<any>[];
      path?: Component<LinkConfig>;
    };
  };
  selected?: string;
}

export interface ResourceViewerOptions {
  edges?: {
    [key: string]: {
      node: string;
      edge: string;
    }[];
  };
  nodes?: {
    [key: string]: {
      name?: string;
      apiVersion?: string;
      kind?: string;
      status?: string;
      details?: Component<any>[];
      path?: Component<LinkConfig>;
    };
  };
  selected?: string;
}

interface ResourceViewerParameters {
  options?: ResourceViewerOptions;
  factoryMetadata?: FactoryMetadata;
}

export class ResourceViewerFactory
  implements ComponentFactory<ResourceViewerConfig> {
  private readonly edges:
    | {
        [key: string]: {
          node: string;
          edge: string;
        }[];
      }
    | undefined;
  private readonly nodes:
    | {
        [key: string]: {
          name?: string;
          apiVersion?: string;
          kind?: string;
          status?: string;
          details?: Component<any>[];
          path?: Component<LinkConfig>;
        };
      }
    | undefined;
  private readonly selected: string | undefined;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ options, factoryMetadata }: ResourceViewerParameters) {
    this.factoryMetadata = factoryMetadata;

    if (options) {
      this.edges = options.edges;
      this.nodes = options.nodes;
      this.selected = options.selected;
    }
  }

  toComponent(): Component<ResourceViewerConfig> {
    return {
      metadata: {
        type: 'resourceViewer',
        ...this.factoryMetadata,
      },
      config: {
        ...(this.edges && { edges: this.edges }),
        ...(this.nodes && { nodes: this.nodes }),
        ...(this.selected && { selected: this.selected }),
      },
    };
  }
}
