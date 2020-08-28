/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { V1ObjectMeta, V1ObjectReference } from "@kubernetes/client-node";

// components
import { AnnotationsFactory } from "./octant/annotations";
import { Component } from "./octant/component";
import { ComponentFactory, FactoryMetadata } from "./octant/component-factory";
import { LabelsFactory } from "./octant/labels";
import { SummaryFactory } from "./octant/summary";
import { TimestampFactory } from "./octant/timestamp";
import { LinkFactory } from "./octant/link";

interface RuntimeObject {
  metadata: V1ObjectMeta;
}

interface MetadataSummaryParameters {
  object: RuntimeObject;
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  factoryMetadata?: FactoryMetadata;
}

export class MetadataSummaryFactory implements ComponentFactory<any> {
  private readonly object: RuntimeObject;
  private readonly linker: (ref: V1ObjectReference, context?: V1ObjectReference) => string;
  private readonly factoryMetadata?: FactoryMetadata;

  constructor({ object, linker, factoryMetadata }: MetadataSummaryParameters) {
    this.object = object;
    this.linker = linker;
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
            ref: this.linker({
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
