/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// GENERATED: do not edit!

import { ComponentFactory, FactoryMetadata } from './component-factory';
import { Component } from './component';

import { CardConfig } from './card';

export interface CardListConfig {
  cards: Component<CardConfig>[];
}

interface CardListParameters {
  cards: Component<CardConfig>[];
  factoryMetadata?: FactoryMetadata;
}

export class CardListFactory implements ComponentFactory<CardListConfig> {
  private readonly cards: Component<CardConfig>[];
  private readonly factoryMetadata: FactoryMetadata | undefined;

  constructor({ cards, factoryMetadata }: CardListParameters) {
    this.cards = cards;
    this.factoryMetadata = factoryMetadata;
  }

  toComponent(): Component<CardListConfig> {
    return {
      metadata: {
        type: 'cardList',
        ...this.factoryMetadata,
      },
      config: {
        cards: this.cards,
      },
    };
  }
}
