/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { Component } from "./octant/component";
import { ComponentFactory, FactoryMetadata } from "./octant/component-factory";
import { TextFactory } from "./octant/text";

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

interface ConditionParameters {
  conditions?: Condition[];
  type: string;
}

export class ConditionSummaryFactory implements ComponentFactory<any> {
  private readonly condition?: Condition;

  constructor({ conditions, type }: ConditionParameters) {
    this.condition = findConditionByType(conditions, type);
  }
  
  toComponent(): Component<any> {
    let value = ConditionStatus.Unknown as string;

    if (this.condition?.status === ConditionStatus.True) {
      value = this.condition?.type;
    } else if (this.condition?.status == ConditionStatus.False) {
      value = `Not ${this.condition?.type}`;
    }
    if (this.condition?.reason) {
      value = `${value} - ${this.condition?.reason}`;
    }

    return new TextFactory({ value }).toComponent();
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

export class ConditionStatusFactory implements ComponentFactory<any> {
  private readonly condition?: Condition;

  constructor({ conditions, type }: ConditionParameters) {
    this.condition = findConditionByType(conditions, type);
  }
  
  toComponent(): Component<any> {
    let value = this.condition?.status || ConditionStatus.Unknown as string;

    if (this.condition?.reason) {
      value = `${value} - ${this.condition?.reason}`;
    }
    if (this.condition?.message) {
      value = `${value}: ${this.condition?.message}`;
    }

    return new TextFactory({ value }).toComponent();
  }
}

function findConditionByType(conditions: Condition[] | undefined, type: string): Condition | undefined {
  return (conditions || []).find(cond => cond.type === type);
}
