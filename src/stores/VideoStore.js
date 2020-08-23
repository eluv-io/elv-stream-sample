import {observable, action, flow, runInAction} from "mobx";
import HLSPlayer from "hls-fix";

const profileSettings = {
  alice: {
    email: "alice@example.com"
  },
  bob: {
    email: "bob@example.com"
  },
  carol: {
    email: "carol@example.com"
  }
};

class VideoStore {
  @observable loading = false;
  @observable error = "";

  @observable loadId = 1;
  @observable dashjsSupported = typeof (window.MediaSource || window.WebKitMediaSource) === "function";
  @observable hlsjsSupported = HLSPlayer.isSupported();
  @observable contentId;
  @observable posterUrl;
  @observable playoutOptions;
  @observable bitmovinPlayoutOptions;
  @observable title;
  @observable bandwidthEstimate = 0;

  @observable muted = false;
  @observable volume = 1;

  @observable playerLevels = [];
  @observable playerCurrentLevel;
  @observable playerAudioTracks = [];
  @observable playerCurrentAudioTrack;

  @observable protocol = this.dashjsSupported ? "dash" : "hls";
  @observable drm = "clear";
  @observable aesOption = "aes-128";

  @observable playoutHandler = "playout_scte";
  @observable offering = "default";
  @observable playoutType;
  @observable availableOfferings = ["default"];

  @observable authContext = {};
  @observable profile = "alice";
  @observable useBitmovin = true;

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
    this.playoutHandler = "playout_scte";
    this.offering = "default";
    this.playoutType = undefined;

    this.playerLevels = [];
    this.playerCurrentLevel = undefined;
    this.playerAudioTracks = [];
    this.playerCurrentAudioTrack = undefined;
  }

  @action.bound
  async SetProfile(profile) {
    if(!Object.keys(profileSettings).includes(profile)) {
      throw Error("Unknown profile: " + profile);
    }

    this.profile = profile;

    await this.SetAuthContext(this.authContext);

    if(this.contentId) {
      this.LoadVideo({contentId: this.contentId});
    }
  }

  @action.bound
  async SetAuthContext(context) {
    try {
      await this.rootStore.client.SetAuthContext({
        context: {
          ...(context || {}),
          ...(profileSettings[this.profile])
        }
      });
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

    this.error = "";

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

      this.availableOfferings = yield client.AvailableOfferings({objectId, versionHash, handler: this.playoutHandler});
      yield this.LoadVideoPlayout({libraryId, objectId, versionHash});

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
      handler: this.playoutHandler,
      offering: this.offering,
      playoutType: this.playoutType
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

    const bitmovinPlayoutOptions = yield this.rootStore.client.BitmovinPlayoutOptions({
      objectId,
      versionHash,
      protocols: [this.protocol],
      drms: [this.drm],
      handler: this.playoutHandler,
      offering: this.offering,
      playoutType: this.playoutType
    });

    this.playoutOptions = playoutOptions;
    this.bitmovinPlayoutOptions = bitmovinPlayoutOptions;
  });
}

export default VideoStore;
