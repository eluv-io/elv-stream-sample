import {configure, observable, action, flow} from "mobx";

import {FrameClient} from "elv-client-js/src/FrameClient";
import VideoStore from "./Video";
import MetricsStore from "./Metrics";
import RecordingsStore from "./Recordings";

// Force strict mode so mutations are only allowed within actions.
configure({
  enforceActions: "always"
});

class RootStore {
  @observable client;
  @observable balance = 0;
  @observable availableProtocols = ["hls"];
  @observable availableDRMs = ["aes-128"];

  constructor() {
    this.videoStore = new VideoStore(this);
    this.metricsStore = new MetricsStore(this);
    this.recordingsStore = new RecordingsStore(this);

    this.InitializeClient();
  }

  @action.bound
  InitializeClient = flow(function * () {
    let client;

    // Initialize ElvClient or FrameClient
    if(window.self === window.top) {
      const ElvClient = (yield import(
        /* webpackChunkName: "elv-client-js" */
        /* webpackMode: "lazy" */
        "elv-client-js"
      )).ElvClient;

      client = yield ElvClient.FromConfigurationUrl({
        configUrl: EluvioConfiguration["config-url"]
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
    }

    this.availableDRMs = yield client.AvailableDRMs();

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
    this.availableProtocols = availableProtocols;
    this.balance = balance;

    //this.recordingsStore.InitializeRecordingsLibrary();
  })
}

const rootStore = new RootStore();
const videoStore = rootStore.videoStore;
const metricsStore = rootStore.metricsStore;
const recordingsStore = rootStore.recordingsStore;

export const root = rootStore;
export const video = videoStore;
export const metrics = metricsStore;
export const recordings = recordingsStore;
