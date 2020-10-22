/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta } from "@kubernetes/client-node";

// components
import { AnnotationsFactory } from "@project-octant/plugin/components/annotations";
import { Component } from "@project-octant/plugin/components/component";
import { ComponentFactory, FactoryMetadata } from "@project-octant/plugin/components/component-factory";
import { LabelsFactory } from "@project-octant/plugin/components/labels";
import { SummaryFactory } from "@project-octant/plugin/components/summary";
import { TimestampFactory } from "@project-octant/plugin/components/timestamp";
import { LinkFactory } from "@project-octant/plugin/components/link";

import ctx from "../context";

export interface RuntimeObject {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
}

interface MetadataSummaryParameters {
  object: RuntimeObject;
  factoryMetadata?: FactoryMetadata;
}

export class MetadataSummaryFactory implements ComponentFactory<any> {
  private readonly object: RuntimeObject;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ object, factoryMetadata }: MetadataSummaryParameters) {
    this.object = object;
    this.factoryMetadata = factoryMetadata;
  }
  
  toComponent(): Component<any> {
    const { metadata } = this.object;

    const sections = [] as {
      header: string;
      content: Component<any>;
    }[];

    sections.push({
      header: "Age",
      content: new TimestampFactory({
        timestamp: Math.floor(new Date(metadata.creationTimestamp || 0).getTime() / 1000)
      }).toComponent(),
    });

    if (Object.keys(metadata.labels || {}).length) {
      sections.push({
        header: "Labels",
        content: new LabelsFactory({
          labels: metadata.labels || {},
        }).toComponent(),
      });
    }

    if (Object.keys(metadata.annotations || {}).length) {
      sections.push({
        header: "Annotations",
        content: new AnnotationsFactory({
          annotations: metadata.annotations || {},
        }).toComponent(),
      });
    }

    for (const owner of metadata.ownerReferences || []) {
      if (owner.controller) {
        sections.push({
          header: "Controlled By",
          content: new LinkFactory({
            value: owner.name,
            ref: ctx.linker({
              apiVersion: owner.apiVersion,
              kind: owner.kind,
              namespace: this.object.metadata.namespace || "",
              name: owner.name,
            }),
          }).toComponent(),
        });
      }
    }

    return new SummaryFactory({ sections, factoryMetadata: this.factoryMetadata }).toComponent();
  }
}
