/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { TextFactory } from "@project-octant/plugin/components/text";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";

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
    return new TextFactory({ value: this.statusText() }).toComponent();
  }

  statusCode(): number {
    if (this.condition?.status === ConditionStatus.True) {
      return 1;
    } else if (this.condition?.status == ConditionStatus.False) {
      return 3;
    } else {
      return 2;
    }
  }

  statusRV(): string {
    if (this.condition?.status === ConditionStatus.True) {
      return "ok";
    } else if (this.condition?.status == ConditionStatus.False) {
      return "error";
    } else {
      return "warning";
    }
  }

  statusText(): string {
    let value = ConditionStatus.Unknown as string;

    if (this.condition?.status === ConditionStatus.True) {
      value = this.condition?.type;
    } else if (this.condition?.status == ConditionStatus.False) {
      value = `Not ${this.condition?.type}`;
    }
    if (this.condition?.reason) {
      value = `${value} - ${this.condition?.reason}`;
    }

    return value;
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


interface ConditionListParameters {
  conditions: Condition[];
  factoryMetadata?: FactoryMetadata;
}

export class ConditionListFactory implements ComponentFactory<any> {
  private readonly conditions: Condition[];
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ conditions, factoryMetadata }: ConditionListParameters) {
    this.conditions = conditions;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const columns = {
      type: 'Type',
      reason: 'Reason',
      status: 'Status',
      message: 'Message',
      lastTransition: 'Last Transition'
    };
    const table = new h.TableFactoryBuilder([], [], void 0, void 0, void 0, void 0, this.factoryMetadata);
    table.columns = [
      columns.type,
      columns.reason,
      columns.status,
      columns.message,
      columns.lastTransition,
    ];
    table.emptyContent = "There are no conditions!";
    table.loading = false;
    
    for (const condition of this.conditions) {
      const row = new h.TableRow(
        {
          [columns.type]: new TextFactory({ value: condition.type }),
          [columns.reason]: condition.reason ?
            new TextFactory({ value: condition.reason }) :
            new TextFactory({ value: '*unknown*', options: { isMarkdown: true } }),
          [columns.status]: new TextFactory({ value: condition.status || ConditionStatus.Unknown }),
          [columns.message]: condition.message ?
            new TextFactory({ value: condition.message }) :
            new TextFactory({ value: '*empty*', options: { isMarkdown: true } }),
          [columns.lastTransition]: condition.lastTransitionTime ?
            new TimestampFactory({ timestamp: Math.floor(new Date(condition.lastTransitionTime || 0).getTime() / 1000) }) :
            new TextFactory({ value: '*unknown*', options: { isMarkdown: true } }),
        },
        {
          // abuse isDeleting to highlight false conditions
          isDeleting: condition.status == ConditionStatus.False,
        }
      );

      table.push(row);   
    }

    return table.getFactory().toComponent();
  }
}
