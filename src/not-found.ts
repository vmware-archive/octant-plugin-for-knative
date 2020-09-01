/*
 * Copyright (c) 2020 the Octant contributors. All Rights Reserved.
 * SPDX-License-Identifier: Apache-2.0
 */

// helpers for generating the
// objects that Octant can render to components.
import * as h from "./octant/component-helpers";

// components
import { ContentResponse } from "./octant/plugin";
import { ListFactory } from "./octant/list";
import { TextFactory } from "./octant/text";

interface NotFoundParameters {
  contentPath: string;
}

export function notFoundContentResponse({ contentPath }: NotFoundParameters): ContentResponse {
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
        },
      }).toComponent(),
    ],
    factoryMetadata: {
      title: [title.toComponent()],
    },
  });

  return h.createContentResponse([title], [body]);
};
