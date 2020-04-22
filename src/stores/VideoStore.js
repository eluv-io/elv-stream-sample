import {observable, action, flow} from "mobx";
import HLSPlayer from "hls.js/dist/hls";

class VideoStore {
  @observable loading = false;
  @observable error = "";

  @observable hlsjsSupported = HLSPlayer.isSupported();
  @observable contentId;
  @observable posterUrl;
  @observable playoutOptions;
  @observable title;
  @observable bandwidthEstimate = 0;
  @observable volume = 1;

  @observable playerLevels = [];
  @observable playerCurrentLevel;

  @observable protocol = "dash";
  @observable drm = "clear";

  constructor(rootStore) {
    this.rootStore = rootStore;

    this.displayMap = {
      "aes-128": "AES-128",
      "clear": "Clear",
      "dash": "Dash",
      "hls": "HLS",
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

    this.playerLevels = [];
    this.playerCurrentLevel = undefined;
  }

  @action.bound
  SetPlayerLevels({levels, currentLevel}) {
    this.playerLevels = levels;
    this.playerCurrentLevel = currentLevel;
  }

  @action.bound
  UpdateVolume(event) {
    this.volume = event.target.muted ? 0 : event.target.volume;
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
      this.drm = playoutMethods.clear ? "clear" : (playoutMethods["aes-128"] ? "aes-128" : "widevine");
    } else if(this.drm !== "clear") {
      this.drm = this.protocol === "hls" ? "aes-128" : "widevine";
    }
  }

  @action.bound
  SetDRM(drm) {
    this.drm = drm;
  }

  @action.bound
  LoadVideo = flow(function * ({contentId}) {
    this.Reset();

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
    // Check for default source link
    const defaultSource = yield this.rootStore.client.ContentObjectMetadata({
      libraryId,
      objectId,
      versionHash,
      metadataSubtree: "public/asset_metadata/sources/default"
    });

    const playoutOptions = yield this.rootStore.client.PlayoutOptions({
      objectId,
      versionHash,
      linkPath: defaultSource ? "public/asset_metadata/sources/default" : ""
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
      this.drm = playoutMethods.clear ? "clear" : (playoutMethods["aes-128"] ? "aes-128" : "widevine");
    }

    this.playoutOptions = playoutOptions;
  });
}

export default VideoStore;
