/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component } from "../octant/component";
import { ComponentFactory, FactoryMetadata } from "../octant/component-factory";
import { TextFactory } from "../octant/text";

export interface Condition {
  status?: ConditionStatus;
  type: string;
  reason?: string;
  message?: string;
  lastTransitionTime: Date;
}

export enum ConditionStatus {
  True = "True",
  False = "False",
  Unknown = "Unknown",
}

interface ConditionSummaryParameters {
  condition?: Condition;
  factoryMetadata?: FactoryMetadata;
}

export class ConditionSummaryFactory implements ComponentFactory<any> {
  private readonly condition?: Condition;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ condition, factoryMetadata }: ConditionSummaryParameters) {
    this.condition = condition;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const { factoryMetadata } = this;

    if (this.condition?.status === ConditionStatus.True) {
      return new TextFactory({ value: "Ready", factoryMetadata }).toComponent();
    } else if (this.condition?.status == ConditionStatus.False) {
      return new TextFactory({ value: `${this.condition.reason}: ${this.condition.message}`, factoryMetadata }).toComponent();
    } else {
      return new TextFactory({ value: "Unknown", factoryMetadata }).toComponent();
    }
  }

  status(): number {
    if (this.condition?.status === ConditionStatus.True) {
      return 1;
    } else if (this.condition?.status == ConditionStatus.False) {
      return 3;
    } else {
      return 2;
    }
  }
}
