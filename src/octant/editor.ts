/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

export interface EditorConfig {
  value: string;
  readOnly: boolean;
  metadata: { [key: string]: string };
  submitAction: string;
  submitLabel: string;
}

interface EditorParameters {
  value: string;
  readOnly: boolean;
  metadata: { [key: string]: string };
  submitAction: string;
  submitLabel: string;
  factoryMetadata?: FactoryMetadata;
}

export class EditorFactory implements ComponentFactory<EditorConfig> {
  private readonly value: string;
  private readonly readOnly: boolean;
  private readonly metadata: { [key: string]: string };
  private readonly submitAction: string;
  private readonly submitLabel: string;
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({
    value,
    readOnly,
    metadata,
    submitAction,
    submitLabel,
    factoryMetadata,
  }: EditorParameters) {
    this.value = value;
    this.readOnly = readOnly;
    this.metadata = metadata;
    this.submitAction = submitAction;
    this.submitLabel = submitLabel;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<EditorConfig> {
    return {
      metadata: {
        type: 'editor',
        ...this.factoryMetadata,
      },
      config: {
        value: this.value,
        readOnly: this.readOnly,
        metadata: this.metadata,
        submitAction: this.submitAction,
        submitLabel: this.submitLabel,
      },
    };
  }
}
