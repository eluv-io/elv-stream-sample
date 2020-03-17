import {configure, observable, action, flow} from "mobx";

import { FrameClient } from "elv-client-js/src/FrameClient";

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

  constructor() {
    this.videoStore = new VideoStore(this);
    this.metricsStore = new MetricsStore(this);

    this.InitializeClient();
  }

  @action.bound
  InitializeClient = flow(function * (region="", fabricNode="", ethNode) {
    this.client = undefined;

    if(region || fabricNode || ethNode) {
      this.manualNodeSelection = true;
    } else {
      this.manualNodeSelection = false;
    }

    let client;
    // Initialize ElvClient or FrameClient
    if(window.self === window.top) {
      const ElvClient = (yield import("elv-client-js")).ElvClient;

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
    }

    // Record available nodes
    this.nodes = yield client.Nodes();

    if(this.manualNodeSelection) {
      this.fabricNode = fabricNode || this.nodes.fabricURIs[0];
      this.ethNode = ethNode || this.nodes.ethereumURIs[0];

      yield client.SetNodes({fabricURIs: [this.fabricNode], ethereumURIs: [this.ethNode]});
    }

    this.availableDRMs = yield client.AvailableDRMs();

    this.client = client;
    this.region = region;

    if(!this.initialLoadComplete) {
      const urlParams = new URLSearchParams(window.location.search);
      const initialContentId =
        urlParams.get("objectId") ||
        urlParams.get("versionHash");

      if(initialContentId) {
        yield this.videoStore.LoadVideo({contentId: initialContentId});
      }
    } else if(this.videoStore.contentId) {
      yield this.videoStore.LoadVideo({contentId: this.videoStore.contentId});
    }

    this.initialLoadComplete = true;
  });
}

const root = new RootStore();

export const rootStore = root;
export const videoStore = root.videoStore;
export const metricsStore = root.metricsStore;

