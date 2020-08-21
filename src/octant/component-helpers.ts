/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import * as octant from "./plugin";

import { ComponentFactory } from "./component-factory";
import { ButtonGroupFactory } from "./button-group";
import { FlexLayoutFactory } from "./flexlayout";
import { SummaryFactory } from "./summary";

export const createPrintResponse = (
  config?: SummaryFactory,
  status?: SummaryFactory,
  items?: {width: number, view: ComponentFactory<any>}[],
): octant.PrintResponse => {
  return {
    config: config?.toComponent().config.sections,
    status: status?.toComponent().config.sections,
    items: items?.map((i) => { return {width: i.width, view: i.view.toComponent()}}),
  };
};

export const createTabResponse = (
  name: string,
  contents: FlexLayoutFactory
): octant.TabResponse => {
  return {
    tab: {
      name: name,
      contents: contents.toComponent(),
    },
  };
};

export const createContentResponse = (
  title: ComponentFactory<any>[],
  bodyComponents: ComponentFactory<any>[],
  buttonGroup?: ButtonGroupFactory
): octant.ContentResponse => {
  return {
    content: {
      title: title.map((t) => t.toComponent()),
      viewComponents: bodyComponents.map((c) => c.toComponent()),
      buttonGroup: buttonGroup?.toComponent(),
    },
  };
};

export enum Width {
  Half = 12,
  Full = 24,
}

export class Navigation implements octant.Navigation {
  title: string;
  path: string;
  iconName?: string;

  children: octant.Navigation[];

  constructor(title: string, path: string, icon?: string) {
    this.title = title;
    this.path = "/" + path;
    this.iconName = icon;
    this.children = [];
  }

  add(title: string, path: string, icon?: string) {
    this.children.push({
      title: title,
      path: this.path + "/" + path,
      iconName: icon,
    });
  }
}
