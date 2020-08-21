// core-js and regenerator-runtime are requried to ensure the correct polyfills
// are applied by babel/webpack.
import "core-js/stable";
import "regenerator-runtime/runtime";

// plugin contains interfaces your plugin can expect
// this includes your main plugin class, response, requests, and clients.
import * as octant from "./octant/plugin";

// helpers for generating the
// objects that Octant can render to components.
import * as h from "./octant/component-helpers";

// components
import { TextFactory } from "./octant/text";

// rxjs is used to show that Observables function within
// the Octant JavaScript runtime.
import { Subject, BehaviorSubject } from "rxjs";
import { CardFactory } from "./octant/card";
import { FlexLayoutFactory } from "./octant/flexlayout";
import { ButtonGroupFactory } from "./octant/button-group";
import { SummaryFactory } from "./octant/summary";

// This plugin will handle v1/Pod types.
let podGVK = { version: "v1", kind: "Pod" };

export default class MyPlugin implements octant.Plugin {
  // Static fields that Octant uses
  name = "knative";
  description = "Knative plugin for Octant";

  // If true, the contentHandler and navigationHandler will be called.
  isModule = true;;

  // Octant will assign these via the constructor at runtime.
  dashboardClient: octant.DashboardClient;
  httpClient: octant.HTTPClient;

  // Plugin capabilities
  capabilities = {
    supportPrinterConfig: [podGVK],
    supportTab: [podGVK],
    actionNames: ["knative/testAction", "action.octant.dev/setNamespace"],
  };

  // Custom plugin properties
  actionCount: number;
  currentNamespace: Subject<string>;

  // Octant expects plugin constructors to accept two arguments, the dashboardClient and the httpClient
  constructor(
    dashboardClient: octant.DashboardClient,
    httpClient: octant.HTTPClient
  ) {
    this.dashboardClient = dashboardClient;
    this.httpClient = httpClient;

    // set intial actionCount
    this.actionCount = 0;
    this.currentNamespace = new BehaviorSubject("default");
  }

  printHandler(request: octant.ObjectRequest): octant.PrintResponse {
    const myText = new TextFactory({
      value: "my **bold** and *emphisized* test",
      options: { isMarkdown: true },
    }).toComponent();

    const config = new SummaryFactory({
      sections: [{ header: "plugin-foo-config", content: myText }],
    });

    const status = new SummaryFactory({
      sections: [{ header: "plugin-foo-status", content: myText }],
    });

    let cardA = new CardFactory({
      body: new TextFactory({
        value: "actionCount: " + this.actionCount + "\ncard body 1",
      }).toComponent(),
      factoryMetadata: {
        title: [new TextFactory({ value: "Card 1" }).toComponent()],
      },
    });

    let items = [{ width: h.Width.Half, view: cardA }];

    return h.createPrintResponse(config, status, items);
  }

  actionHandler(request: octant.ActionRequest): octant.ActionResponse | void {
    if (request.actionName === "knative/testAction") {
      this.actionCount += 1;
      return;
    }

    if (request.actionName === "action.octant.dev/setNamespace") {
      this.currentNamespace.next(request.payload.namespace);
      return;
    }

    return;
  }

  tabHandler(request: octant.ObjectRequest): octant.TabResponse {
    let cardA = new CardFactory({
      body: new TextFactory({ value: "card body A" }).toComponent(),
    }).toComponent();

    let cardB = new CardFactory({
      body: new TextFactory({ value: "card body B" }).toComponent(),
    }).toComponent();

    let layout = new FlexLayoutFactory({
      options: {
        sections: [
          [
            { width: h.Width.Half, view: cardA },
            { width: h.Width.Half, view: cardB },
          ],
        ],
      },
    });

    return h.createTabResponse("Knative", layout);
  }

  navigationHandler(): octant.Navigation {
    let nav = new h.Navigation("Yeoman Plugin", "knative", "cloud");
    nav.add("test menu flyout", "nested-path", "folder");
    return nav;
  }

  contentHandler(request: octant.ContentRequest): octant.ContentResponse {
    let contentPath = request.contentPath;
    let title = [new TextFactory({ value: "Knative>" })];
    if (contentPath.length > 0) {
      title.push(new TextFactory({ value: contentPath }));
    }

    let namespace = "<unknown>";
    this.currentNamespace.subscribe((data) => {
      namespace = data;
    });

    let cardA = new CardFactory({
      body: new TextFactory({
        value: "actionCount: " + this.actionCount + "\ncard body 1",
      }).toComponent(),
      factoryMetadata: {
        title: [new TextFactory({ value: "Card 1" }).toComponent()],
      },
    });

    let cardB = new CardFactory({
      body: new TextFactory({ value: "card body 2" }).toComponent(),
      factoryMetadata: {
        title: [new TextFactory({ value: "Card 2" }).toComponent()],
      },
    });

    const testButton = {
      name: "Test",
      payload: { action: "knative/testAction", foo: "bar" },
      confirmation: {
        title: "Confirmation?",
        body: "Confirm this button click",
      },
    };

    let buttonGroup = new ButtonGroupFactory({
      buttons: [testButton],
    });

    return h.createContentResponse(title, [cardA, cardB], buttonGroup);
  }
}

console.log("loading knative.ts");
