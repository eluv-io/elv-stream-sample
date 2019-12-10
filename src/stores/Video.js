import {observable, action, flow, toJS} from "mobx";
import HLSPlayer from "../../node_modules/hls.js/dist/hls";

class VideoStore {
  @observable availableContent = EluvioConfiguration.availableContent || [];

  @observable loading = true;
  @observable error;

  @observable hlsjsSupported = HLSPlayer.isSupported();

  @observable videoType = "normal";
  @observable contentId;
  @observable posterUrl;
  @observable metadata = {};
  @observable availableDRMs = [];
  @observable authToken;
  @observable playoutOptions = {};
  @observable protocol = "hls";
  @observable drm = "aes-128";

  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  @action.bound
  SetAvailableContent(content) {
    this.availableContent = content;
  }

  @action.bound
  LoadVideo = flow(function * ({contentId, protocol}) {
    this.loading = true;
    this.error = undefined;

    const client = this.rootStore.client;

    try {
      let libraryId, objectId, versionHash;
      if(contentId.startsWith("iq__")) {
        objectId = contentId;
        libraryId = yield client.ContentObjectLibraryId({objectId});
      } else if(contentId.startsWith("hq")) {
        versionHash = contentId;
      } else {
        throw Error(`Invalid content ID: ${contentId}`);
      }

      this.metadata = yield client.ContentObjectMetadata({libraryId, objectId, versionHash});
      this.contentId = contentId;
      this.protocol = protocol;

      if(this.metadata.offerings) {
        this.videoType = "normal";
      } else {
        this.videoType = "live";
      }

      yield this.LoadVideoPlayout({libraryId, objectId, versionHash, protocol});
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("Failed to load content:");
      // eslint-disable-next-line no-console
      console.error(error);

      this.error = "Failed to load content";
    }

    this.loading = false;
  });

  @action.bound
  LoadVideoPlayout = flow(function * ({libraryId, objectId, versionHash, protocol}) {
    this.videoType = "normal";
    this.playoutOptions = yield this.rootStore.client.PlayoutOptions({
      objectId,
      versionHash,
      protocols: toJS(this.rootStore.availableProtocols),
      drms: toJS(this.rootStore.availableDRMs)
    });

    this.authToken = yield this.rootStore.client.GenerateStateChannelToken({objectId, versionHash});

    this.posterUrl = yield this.rootStore.client.Rep({
      libraryId,
      objectId,
      versionHash,
      rep: "player_background",
      channelAuth: true
    });

    if(!this.playoutOptions[protocol]) {
      this.protocol = Object.keys(this.playoutOptions)[0];
    }

    this.availableDRMs = Object.keys(this.playoutOptions[protocol].playoutMethods)
      .filter(drm => this.rootStore.availableDRMs.includes(drm))
      .sort((a, b) => a.toLowerCase() === "clear" ? 1 : a > b);

    if(!this.playoutOptions[protocol].playoutMethods[this.drm]) {
      this.drm = this.availableDRMs[0];
    }
  });

  @action.bound
  SetDRM(drm) {
    this.drm = drm;
  }
}

export default VideoStore;
