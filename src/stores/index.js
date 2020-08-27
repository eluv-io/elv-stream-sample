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
  @observable manualNodeSelection = false;

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
  }

  @action.bound
  InitializeClient = flow(function * (region="", fabricNode="", ethNode) {
    if(region || fabricNode || ethNode) {
      this.manualNodeSelection = true;
    } else {
      this.manualNodeSelection = false;
    }

    let client;
    // Initialize ElvClient or FrameClient
    if(window.self === window.top) {
      const ElvClient = (yield import("@eluvio/elv-client-js")).ElvClient;

      client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"],
        region
      });

      const wallet = client.GenerateWallet();
      const mnemonic = wallet.GenerateMnemonic();
      const signer = wallet.AddAccountFromMnemonic({mnemonic});

      client.SetSigner({signer});
    } else {
      // Contained in IFrame
      client = new FrameClient({
        target: window.parent,
        timeout: 30
      });

      if(region) {
        yield client.UseRegion({region});
      }

      // Hide header if in frame
      if(!this.initialLoadComplete) {
        client.SendMessage({options: {operation: "HideHeader"}, noResponse: true});
      }
    }

    // Record available nodes
    this.nodes = yield client.Nodes();

    if(this.manualNodeSelection) {
      this.fabricNode = fabricNode || this.nodes.fabricURIs[0];
      this.ethNode = ethNode || this.nodes.ethereumURIs[0];

      yield client.SetNodes({fabricURIs: [this.fabricNode], ethereumURIs: [this.ethNode]});
    }

    this.availableDRMs = yield client.AvailableDRMs();

    if(this.availableDRMs.includes("sample-aes")) {
      this.videoStore.aesOption = "sample-aes";
    }

    this.client = client;
    this.region = region;

    if(!this.videoStore.profile) {
      yield this.videoStore.SetProfile(EluvioConfiguration.profile || Object.keys(this.videoStore.profileSettings)[0], false);
    }

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
        yield this.videoStore.LoadVideo({
          contentId: EluvioConfiguration.availableContent[0].versionHash ||
            EluvioConfiguration.availableContent[0].objectId
        });
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

