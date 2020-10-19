/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

import { RuntimeObject } from "./metadata";

interface GridAction {
  name: string;
  actionPath: string;
  payload: { [key: string]: any };
  confirmation?: {
    title: string;
    body: string;
  };
  type: string;
}

export function deleteGridAction(obj: RuntimeObject): GridAction {
  return {
    name: "Delete",
    actionPath: "action.octant.dev/deleteObject",
    payload: {
      apiVersion: obj.apiVersion,
      kind: obj.kind,
      namespace: obj.metadata.namespace,
      name: obj.metadata.name,
    },
    confirmation: {   
      title: `Delete ${obj.kind}`,
      body: `Are you sure you want to delete *${obj.kind}* **${obj.metadata.name}**? This action is permanent and cannot be recovered.`,
    },
    type: "danger",
  };
}
