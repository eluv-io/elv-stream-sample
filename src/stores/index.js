import {configure, observable, action, flow} from "mobx";

import {FrameClient} from "elv-client-js/src/FrameClient";
import VideoStore from "./Video";
import MetricsStore from "./Metrics";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  @observable client;
  @observable region;
  @observable nodes;
  @observable balance = 0;
  @observable availableProtocols = ["hls"];
  @observable availableDRMs = ["clear", "aes-128"];
  @observable devMode = false;

  constructor() {
    this.videoStore = new VideoStore(this);
    this.metricsStore = new MetricsStore(this);

    this.InitializeClient();
  }

  @action.bound
  SetDevMode() {
    this.devMode = true;
  }

  @action.bound
  InitializeClient = flow(function * (region="") {
    this.client = undefined;

    let client;

    // Initialize ElvClient or FrameClient
    if(window.self === window.top) {
      const ElvClient = (yield import(
        /* webpackChunkName: "elv-client-js" */
        /* webpackMode: "lazy" */
        "elv-client-js"
      )).ElvClient;

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

    this.nodes = yield client.Nodes();

    this.availableDRMs = [...(yield client.AvailableDRMs()), "clear"];

    const balance = parseFloat(
      yield client.GetBalance({
        address: yield client.CurrentAccountAddress()
      })
    );

    let availableProtocols = ["hls"];
    if(this.availableDRMs.includes("widevine")) {
      availableProtocols.push("dash");
    }

    this.client = client;
    this.region = region;
    this.availableProtocols = availableProtocols;
    this.balance = balance;
  })
}

const rootStore = new RootStore();
const videoStore = rootStore.videoStore;
const metricsStore = rootStore.metricsStore;

export const root = rootStore;
export const video = videoStore;
export const metrics = metricsStore;
