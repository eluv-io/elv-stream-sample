import {observable, action, flow, runInAction} from "mobx";
import HLSPlayer from "hls.js/dist/hls";

class VideoStore {
  @observable loading = false;
  @observable error = "";

  @observable dashjsSupported = typeof (window.MediaSource || window.WebKitMediaSource) === "function";
  @observable hlsjsSupported = HLSPlayer.isSupported();
  @observable contentId;
  @observable posterUrl;
  @observable playoutOptions;
  @observable title;
  @observable bandwidthEstimate = 0;

  @observable muted = false;
  @observable volume = 1;

  @observable playerLevels = [];
  @observable playerCurrentLevel;
  @observable playerAudioTracks;
  @observable playerCurrentAudioTrack;

  @observable protocol = this.dashjsSupported ? "dash" : "hls";
  @observable drm = "clear";
  @observable aesOption = "aes-128";

  @observable offering = "default";
  @observable availableOfferings = ["default"];

  constructor(rootStore) {
    this.rootStore = rootStore;

    this.displayMap = {
      "aes-128": "AES-128",
      "clear": "Clear",
      "dash": "Dash",
      "hls": "HLS",
      "sample-aes": "Sample AES",
      "widevine": "Widevine"
    };
  }

  @action.bound
  Reset() {
    this.playoutOptions = undefined;
    this.posterUrl = "";
    this.title = "";
    this.contentId = "";
    this.bandwidthEstimate = 0;
    this.error = "";
    this.loading = false;
    this.offering = "default";

    this.playerLevels = [];
    this.playerCurrentLevel = undefined;
    this.playerAudioTracks = [];
    this.playerCurrentAudioTrack = undefined;

    this.rootStore.client.ClearCache();
  }

  @action.bound
  async SetAuthContext(context) {
    try {
      await this.rootStore.client.SetAuthContext({context});

      // eslint-disable-next-line no-console
      console.log("Set auth context:");
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(context, null, 2));
    } catch(error) {
      const message = `Error setting auth context: ${error.message}`;
      this.error = message;

      setTimeout(() => {
        if(this.error === message) {
          runInAction(() => this.error = "");
        }
      }, 5000);
    }
  }

  @action.bound
  SetPlayerLevels({levels, currentLevel}) {
    this.playerLevels = levels;
    this.playerCurrentLevel = currentLevel;
  }

  @action.bound
  SetAudioTracks({tracks, currentTrack}) {
    this.playerAudioTracks = tracks;
    this.playerCurrentAudioTrack = currentTrack;
  }


  @action.bound
  UpdateVolume(event) {
    this.volume = event.target.volume;
    this.muted = event.target.muted;
  }

  @action.bound
  SetBandwidthEstimate(estimate) {
    this.bandwidthEstimate = estimate;
  }

  @action.bound
  SetProtocol(protocol) {
    this.protocol = protocol;

    if(this.playoutOptions) {
      // Prefer clear
      const playoutMethods = this.playoutOptions[this.protocol].playoutMethods;
      this.drm = playoutMethods.clear ? "clear" : (playoutMethods[this.aesOption] ? this.aesOption : "widevine");
    } else if(this.drm !== "clear") {
      this.drm = this.protocol === "hls" ? this.aesOption : "widevine";
    }
  }

  @action.bound
  SetDRM(drm) {
    this.drm = drm;
  }

  @action.bound
  SetOffering(offering) {
    this.offering = offering;

    if(this.contentId) {
      this.LoadVideo({contentId: this.contentId, offering});
    }
  }

  @action.bound
  LoadVideo = flow(function * ({contentId, offering="default"}) {
    this.Reset();

    if(offering) { this.offering = offering; }

    if(!contentId) { return; }

    contentId = contentId.trim();

    this.loading = true;
    this.contentId = contentId;

    const client = this.rootStore.client;

    try {
      let libraryId, objectId, versionHash;
      if(contentId.startsWith("iq__")) {
        objectId = contentId;
        libraryId = yield client.ContentObjectLibraryId({objectId});
      } else if(contentId.startsWith("hq")) {
        versionHash = contentId;
      } else {
        this.error = `Invalid content ID: ${contentId}`;
        return;
      }

      this.title =
        (yield client.ContentObjectMetadata({
          libraryId,
          objectId,
          versionHash,
          metadataSubtree: "public/asset_metadata/display_title"
        })) ||
        (yield client.ContentObjectMetadata({
          libraryId,
          objectId,
          versionHash,
          metadataSubtree: "public/name"
        }));

      this.availableOfferings = yield client.AvailableOfferings({objectId, versionHash});
      yield this.LoadVideoPlayout({libraryId, objectId, versionHash});
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load content:");
      // eslint-disable-next-line no-console
      console.error(error);

      this.Reset();

      this.error = "Failed to load content";
    } finally {
      this.loading = false;
    }
  });

  @action.bound
  LoadVideoPlayout = flow(function * ({libraryId, objectId, versionHash}) {
    const playoutOptions = yield this.rootStore.client.PlayoutOptions({
      objectId,
      versionHash,
      offering: this.offering
    });

    this.posterUrl = yield this.rootStore.client.Rep({
      libraryId,
      objectId,
      versionHash,
      rep: "player_background",
      channelAuth: true
    });

    if(!playoutOptions[this.protocol]) {
      this.protocol = Object.keys(playoutOptions)[0] || "hls";
    }

    if(!playoutOptions[this.protocol].playoutMethods[this.drm]) {
      // Prefer DRM
      const playoutMethods = playoutOptions[this.protocol].playoutMethods;
      this.drm = playoutMethods.clear ? "clear" : (playoutMethods[this.aesOption] ? this.aesOption : "widevine");
    }

    this.playoutOptions = playoutOptions;
  });
}

export default VideoStore;
