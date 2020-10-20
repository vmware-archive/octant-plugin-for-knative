/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// plugin contains interfaces your plugin can expect
// this includes your main plugin class, response, requests, and clients.
import * as octant from "@project-octant/plugin";

// helpers for generating the
// objects that Octant can render to components.
import { createContentResponse } from "@project-octant/plugin/helpers";

// components
import { ListFactory } from "@project-octant/plugin/components/list";
import { TextFactory } from "@project-octant/plugin/components/text";

interface NotFoundParameters {
  contentPath: string;
}

export function notFoundContentResponse({ contentPath }: NotFoundParameters): octant.ContentResponse {
  if (contentPath.endsWith('/')) {
    contentPath = contentPath.slice(0, -1);
  }

  const title = new TextFactory({ value: "Not Found" });
  const body = new ListFactory({
    items: [
      new TextFactory({
        value: `
The requested page was not found. The resource may have been deleted.

You can:
- Wait for the resource to be created
- Use the navigation links to go to a new page
- Go [up one level](#/knative${contentPath.split('/').slice(0, -1).join('/')})
- Use the [back button](javascript:window.history.back()) to return to the previous page
- Learn more about [Knative](https://knative.dev)
        `,
        options: {
          isMarkdown: true,
          trustedContent: true,
        },
      }).toComponent(),
    ],
    factoryMetadata: {
      title: [title.toComponent()],
    },
  });

  return createContentResponse([title], [body]);
};
