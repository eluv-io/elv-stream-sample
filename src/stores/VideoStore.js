import {observable, action, flow, runInAction, computed} from "mobx";
import HLSPlayer from "hls-fix";

class VideoStore {
  @observable loading = false;
  @observable error = "";

  @observable loadId = 1;
  @observable dashjsSupported = typeof (window.MediaSource || window.WebKitMediaSource) === "function";
  @observable hlsjsSupported = HLSPlayer.isSupported();
  @observable contentId;
  @observable posterUrl;
  @observable playoutOptions;
  @observable authToken;
  @observable title;
  @observable bandwidthEstimate = 0;

  @observable muted = false;
  @observable volume = 1;

  @observable playerLevels = [];
  @observable playerCurrentLevel;
  @observable playerAudioTracks = [];
  @observable playerCurrentAudioTrack;
  @observable playerTextTracks = [];
  @observable playerCurrentTextTrack = -1;

  @observable protocol = this.dashjsSupported ? "dash" : "hls";
  @observable drm = "clear";
  @observable aesOption = "aes-128";

  @observable playoutHandler = "playout";
  @observable offering = "default";
  @observable playoutType;
  @observable availableOfferings = ["default"];

  constructor(rootStore) {
    this.rootStore = rootStore;

    this.displayMap = {
      "aes-128": "AES-128",
      "clear": "Clear",
      "dash": "Dash",
      "hls": "HLS",
      "sample-aes": "Sample AES",
      "widevine": "Widevine",
      "fairplay": "FairPlay"
    };
  }

  @computed get metricsSupported() {
    // Cases for which segment metrics cannot be determined
    return !["sample-aes", "fairplay"].includes(this.drm);
  }

  @action.bound
  SetError(message) {
    this.error = message;
  }

  @action.bound
  Reset() {
    this.playoutOptions = undefined;
    this.posterUrl = "";
    this.title = "";
    this.contentId = "";
    this.bandwidthEstimate = 0;
    this.loading = false;
    this.playoutHandler = "playout";
    this.offering = "default";
    this.playoutType = undefined;

    this.playerLevels = [];
    this.playerCurrentLevel = undefined;
    this.playerAudioTracks = [];
    this.playerCurrentAudioTrack = undefined;
    this.playerCurrentTextTrack = -1;

    this.SetError("");
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
      this.SetError(message);

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
  SetTextTracks({tracks, currentTrack}) {
    if(tracks) {
      this.playerTextTracks = tracks;
    }

    this.playerCurrentTextTrack = currentTrack;
  }


  @action.bound
  SetAudioTracks({tracks, currentTrack}) {
    if(tracks) {
      this.playerAudioTracks = tracks;
    }

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
  SetPlayoutHandler(handler) {
    this.playoutHandler = handler;
  }

  @action.bound
  SetOffering(offering) {
    this.offering = offering;
  }

  @action.bound
  SetPlayoutType(playoutType) {
    this.playoutType = playoutType;
  }

  @action.bound
  LoadVideo = flow(function * ({contentId, retry=true}) {
    // Reset state if new video is loaded
    if(retry && this.contentId && this.contentId !== contentId) {
      this.Reset();
    }

    // TODO: Create more surgical cache clearing
    this.rootStore.client.ClearCache();

    this.SetError("");

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
        this.SetError(`Invalid content ID: ${contentId}`);
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

      const isChannel = yield this.rootStore.client.ContentObjectMetadata({
        libraryId,
        objectId,
        versionHash,
        metadataSubtree: "public/channel"
      });

      this.availableOfferings = yield client.AvailableOfferings({
        objectId,
        versionHash,
        handler: isChannel ? "channel" : this.playoutHandler
      });
      yield this.LoadVideoPlayout({objectId, versionHash});

      this.loadId += 1;
    } catch(error) {
      if(retry) {
        yield new Promise(resolve => setTimeout(resolve, 2000));
        return this.LoadVideo({contentId, retry: false});
      }

      // eslint-disable-next-line no-console
      console.error("Failed to load content:");
      // eslint-disable-next-line no-console
      console.error(error);

      this.Reset();

      this.SetError("Failed to load content");
    } finally {
      this.loading = false;
    }
  });

  @action.bound
  LoadVideoPlayout = flow(function * ({objectId, versionHash}) {
    const isChannel = yield this.rootStore.client.ContentObjectMetadata({
      libraryId: yield this.rootStore.client.ContentObjectLibraryId({objectId, versionHash}),
      objectId,
      versionHash,
      metadataSubtree: "public/channel"
    });

    const playoutOptions = yield this.rootStore.client.PlayoutOptions({
      objectId,
      versionHash,
      handler: isChannel ? "channel" : this.playoutHandler,
      offering: this.offering,
      playoutType: this.playoutType
    });

    if(isChannel) {
      this.protocol = "hls";
    }

    if(!playoutOptions[this.protocol]) {
      this.protocol = Object.keys(playoutOptions)[0] || "hls";
    }

    this.authToken = yield this.rootStore.client.GenerateStateChannelToken({objectId, versionHash});

    // If no suitable DRMs in current protocol, switch to other protocol
    if(!Object.keys(playoutOptions[this.protocol].playoutMethods).find(drm => this.rootStore.availableDRMs.includes(drm))) {
      this.SetProtocol(this.protocol === "hls" ? "dash" : "hls");
    }

    // If current DRM is not suitable, switch
    if(!playoutOptions[this.protocol].playoutMethods[this.drm]) {
      // Prefer DRM
      const playoutMethods = playoutOptions[this.protocol].playoutMethods;
      this.drm = playoutMethods.clear ? "clear" : (playoutMethods[this.aesOption] ? this.aesOption : "widevine");
    }

    this.playoutOptions = playoutOptions;
  });
}

export default VideoStore;
