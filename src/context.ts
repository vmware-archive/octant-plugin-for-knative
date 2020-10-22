/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// plugin contains interfaces your plugin can expect
// this includes your main plugin class, response, requests, and clients.
import { V1ObjectReference } from "@kubernetes/client-node";
import * as octant from "@project-octant/plugin";

// pseudo global holder for services and state so we don't need to pass it around
const context = {
  create: false,
  namespace: "default",
  dashboardClient: {} as octant.DashboardClient,
  httpClient: {} as octant.HTTPClient,
  linker: (ref: V1ObjectReference, context?: V1ObjectReference) => {
    return "";
  },
};

export default context;
