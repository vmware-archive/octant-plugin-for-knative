/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// helpers for generating the
// objects that Octant can render to components.
import * as h from "@project-octant/plugin/helpers";

import { V1ContainerPort, V1EnvVar, V1ObjectMeta, V1PodTemplateSpec, V1VolumeMount } from "@kubernetes/client-node";
import { TextFactory } from "@project-octant/plugin/components/text";
import { Component } from "@project-octant/plugin/components/component";
import { LinkFactory } from "@project-octant/plugin/components/link";
import { ListFactory } from "@project-octant/plugin/components/list";
import { Condition } from "./conditions";

import ctx from "../context";

export interface PodSpecable {
  apiVersion: string;
  kind: string;
  metadata: V1ObjectMeta;
  spec: {
    template: V1PodTemplateSpec;
  };
  status: {
    conditions?: Condition[];
  };
}

export function containerPorts(ports?: V1ContainerPort[]): Component<any> {
  return new ListFactory({
    items: (ports || []).map(p =>
      new TextFactory({
        value: `${p.containerPort}/${p.protocol || 'TCP'}`
      }).toComponent(),
    ),
  }).toComponent();
}

export function environmentList(env: V1EnvVar[] | undefined, namespace: string | undefined): Component<any> {
  const columns = {
    name: 'Name',
    value: 'Value',
    source: 'Source',
  };
  const table = new h.TableFactoryBuilder([], []);
  table.columns = [
    columns.name,
    columns.value,
    columns.source,
  ];
  table.loading = false;
  table.emptyContent = "There are no environment variables!";

  for (const e of env || []) {
    const row = new h.TableRow(
      {
        [columns.name]: new TextFactory({ value: e.name }),
      },
    );

    if (e.value) {
      row.data[columns.value] = new TextFactory({ value: e.value || "" });
    }
    if (e.valueFrom?.fieldRef) {
      row.data[columns.source] = new TextFactory({ value: e.valueFrom.fieldRef.fieldPath });
    } else if (e.valueFrom?.resourceFieldRef) {
      row.data[columns.source] = new TextFactory({ value: e.valueFrom.resourceFieldRef.resource });
    } else if (e.valueFrom?.secretKeyRef) {
      row.data[columns.source] = new LinkFactory({
        value: `${e.valueFrom.secretKeyRef.name}:${e.valueFrom.secretKeyRef.key}`,
        ref: ctx.linker({ apiVersion: "v1", kind: "Secret", namespace, name: e.valueFrom.secretKeyRef.name }),
      });
    } else if (e.valueFrom?.configMapKeyRef) {
      row.data[columns.source] = new LinkFactory({
        value: `${e.valueFrom.configMapKeyRef.name}:${e.valueFrom.configMapKeyRef.key}`,
        ref: ctx.linker({ apiVersion: "v1", kind: "ConfigMap", namespace, name: e.valueFrom.configMapKeyRef.name }),
      });
    }

    table.push(row);
  }

  return table.getFactory().toComponent();
}

export function volumeMountList(mounts?: V1VolumeMount[]): Component<any> {
  const columns = {
    name: 'Name',
    mountPath: 'Mount Path',
    propagation: 'Propagation',
  };
  const table = new h.TableFactoryBuilder([], []);
  table.columns = [
    columns.name,
    columns.mountPath,
    columns.propagation,
  ];
  table.loading = false;
  table.emptyContent = "There are no volume mounts!";

  for (const m of mounts || []) {
    const row = new h.TableRow(
      {
        [columns.name]: new TextFactory({ value: m.name }),
        [columns.mountPath]: new TextFactory({ value: `${m.mountPath} (${m.readOnly ? 'ro' : 'rw'})` }),
        [columns.propagation]: new TextFactory({ value: m.mountPropagation || 'None' }),
      },
    );
    table.push(row);
  }

  return table.getFactory().toComponent();
}
