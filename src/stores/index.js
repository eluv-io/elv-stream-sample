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
  @observable availableProtocols = ["hls"];

  constructor() {
    this.videoStore = new VideoStore(this);
    this.metricsStore = new MetricsStore(this);

    this.InitializeClient();
  }

  // Check browser capabilities to determine widevine support
  async AvailableDRMs() {
    const availableDRMs = ["aes-128"];

    if (typeof window.navigator.requestMediaKeySystemAccess !== "function") {
      // eslint-disable-next-line no-console
      console.log("requestMediaKeySystemAccess not available");

      return availableDRMs;
    }

    try {
      const config = [{
        initDataTypes: ["cenc"],
        audioCapabilities: [{
          contentType: "audio/mp4;codecs=\"mp4a.40.2\""
        }],
        videoCapabilities: [{
          contentType: "video/mp4;codecs=\"avc1.42E01E\""
        }]
      }];

      await navigator.requestMediaKeySystemAccess("com.widevine.alpha", config);

      availableDRMs.push("widevine");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.log("No Widevine support detected");
    }

    return availableDRMs;
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
        configUrl: "https://main.net955304.contentfabric.io/config"
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

    let availableProtocols = ["hls"];
    if((yield this.AvailableDRMs()).includes("widevine")) {
      availableProtocols.push("dash");
    }

    this.client = client;
    this.availableProtocols = availableProtocols;
  })
}

const rootStore = new RootStore();
const videoStore = rootStore.videoStore;
const metricsStore = rootStore.metricsStore;

export const root = rootStore;
export const video = videoStore;
export const metrics = metricsStore;
