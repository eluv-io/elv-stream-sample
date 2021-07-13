import {configure, observable, action, flow} from "mobx";
import URI from "urijs";
import { FrameClient } from "@eluvio/elv-client-js/src/FrameClient";

import VideoStore from "./VideoStore";
import MetricsStore from "./Metrics";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  @observable initialLoadComplete = false;

  @observable client;
  @observable region;
  @observable nodes;
  @observable fabricNode;
  @observable ethNode;

  @observable devMode = URI(window.location.toString()).hasQuery("dev");
  @observable displayAppMode = URI(window.location.toString()).hasQuery("action");

  constructor() {
    this.videoStore = new VideoStore(this);
    this.metricsStore = new MetricsStore(this);

    this.InitializeClient();

    window.rootStore = this;
  }

  @action.bound
  InitializeClient = flow(function * (region="", fabricNode="", ethNode) {
    let client;
    // Initialize ElvClient or FrameClient
    if(window.self === window.top) {
      const ElvClient = (yield import("@eluvio/elv-client-js")).ElvClient;

      client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"],
        region
      });

      yield client.SetStaticToken({
        token: client.utils.B64(JSON.stringify({qspace_id: yield client.ContentSpaceId()}))
      });
    } else {
      // Contained in IFrame
      client = new FrameClient({
        target: window.parent,
        timeout: 30
      });

      if(region) {
        yield client.UseRegion({region});
      } else {
        yield client.ResetRegion();
      }

      // Hide header if in frame
      if(!this.initialLoadComplete) {
        client.SendMessage({options: {operation: "HideHeader"}, noResponse: true});
      }
    }

    // Record available nodes
    let nodes = yield client.Nodes();

    if(fabricNode) {
      yield client.SetNodes({fabricURIs: [fabricNode]});

      // Ensure selected node is in list
      if(!nodes.fabricURIs.find(uri => uri === fabricNode)) {
        nodes.fabricURIs.push(fabricNode);
      }
    }

    if(this.ethNode) {
      yield client.SetNodes({ethereumURIs: [ethNode]});

      // Ensure selected node is in list
      if(!nodes.ethereumURIs.find(uri => uri === ethNode)) {
        nodes.ethereumURIs.push(ethNode);
      }
    }

    this.nodes = nodes;

    this.fabricNode = fabricNode;
    this.ethNode = ethNode;

    this.availableDRMs = yield client.AvailableDRMs();

    if(this.availableDRMs.includes("sample-aes")) {
      this.videoStore.aesOption = "sample-aes";
    }

    this.client = client;
    this.region = region;

    if(!this.initialLoadComplete) {
      const urlParams = new URLSearchParams(window.location.search);
      const pathParams = (window.location.hash || "").replace(/^#/, "").replace(/^\//, "").split("/");
      const initialContentId =
        urlParams.get("objectId") ||
        urlParams.get("versionHash") ||
        pathParams[0];

      const initialOffering = urlParams.get("offering") || pathParams[1];

      if(initialContentId) {
        this.videoStore.muted = true;

        if(initialOffering) {
          this.videoStore.SetOffering(initialOffering);
        }

        yield this.videoStore.LoadVideo({contentId: initialContentId});
      } else if(!this.displayAppMode && EluvioConfiguration.availableContent && EluvioConfiguration.availableContent.length > 0) {
        // Start muted for non-autoplay content
        this.videoStore.muted = true;
        yield this.videoStore.LoadVideo({contentId: EluvioConfiguration.availableContent[0].versionHash});
      }
    }

    window.client = this.client;

    this.initialLoadComplete = true;
  });

  @action.bound
  ToggleDevMode(enable) {
    this.devMode = enable;
  }

  @action.bound
  ReturnToApps() {
    this.client.SendMessage({options: {operation: "ShowAppsPage"}, noResponse: true});
  }
}

const root = new RootStore();

export const rootStore = root;
export const videoStore = root.videoStore;
export const metricsStore = root.metricsStore;

