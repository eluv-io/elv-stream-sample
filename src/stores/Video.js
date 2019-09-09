import {observable, action, flow, toJS} from "mobx";
import HLSPlayer from "../../node_modules/hls.js/dist/hls";
import UrlJoin from "url-join";

class VideoStore {
  @observable availableContent = [
    {
      title: "MGM Trailer (4K)",
      versionHash: "hq__EAt4BVedkShkEJxZX7CTiFvhdg7zpwZdaS2cQua9u4bwehBCyeKeFZT5MDYwUMRDMES94Z44M1",
      header: "4K Trailer",
      subHeader: "Used with permission of MGM"
    },
    {
      title: "Big Buck Bunny (4K)",
      versionHash: "hq__BD1BouHkFraAcDjvoyHoiKpVhf4dXzNsDT5USe8mrZ7YDhLPDoZGnoU32iZvDYiQW8vVi6X7rV",
      header: "Big Buck Bunny (4K)"
    }
  ];

  @observable loading = true;
  @observable error;

  @observable hlsjsSupported = HLSPlayer.isSupported();


  @observable videoType = "normal";
  @observable versionHash;
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
  LoadVideo = flow(function * ({versionHash, protocol}) {
    this.loading = true;
    this.error = undefined;

    const client = this.rootStore.client;

    try {
      this.metadata = yield client.ContentObjectMetadata({versionHash});
      this.versionHash = versionHash;
      this.protocol = protocol;

      if(this.metadata.offerings) {
        yield this.LoadNormalVideo({versionHash, protocol});
      } else if(this.metadata.stream_id) {
        yield this.LoadRecording({versionHash});
      } else {
        yield this.LoadLiveVideo({versionHash});
      }
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
  LoadNormalVideo = flow(function * ({versionHash, protocol}) {
    this.videoType = "normal";
    this.playoutOptions = yield this.rootStore.client.PlayoutOptions({
      versionHash,
      protocols: toJS(this.rootStore.availableProtocols),
      drms: toJS(this.rootStore.availableDRMs)
    });

    this.authToken = yield this.rootStore.client.GenerateStateChannelToken({versionHash});

    this.posterUrl = yield this.rootStore.client.Rep({
      versionHash,
      rep: "player_background",
      channelAuth: true
    });

    this.availableDRMs = Object.keys(this.playoutOptions[protocol].drms);
  });

  @action.bound
  LoadLiveVideo = flow(function * ({versionHash}) {
    this.videoType = "live";

    this.playoutOptions = {
      hls: {
        playoutUrl: yield this.rootStore.client.Rep({
          versionHash,
          rep: UrlJoin("live", "default", "hls-clear", "playlist.m3u8"),
          noAuth: true
        }),
        drms: {}
      }
    };

    this.availableDRMs = ["clear"];
  });

  @action.bound
  LoadRecording = flow(function * ({versionHash}) {
    this.videoType = "recording";

    this.playoutOptions = {
      hls: {
        playoutUrl: yield this.rootStore.client.Rep({
          versionHash,
          rep: UrlJoin("live", "default", "hls-clear", "playlist.m3u8"),
          noAuth: true
        }),
        drms: {}
      }
    };

    this.availableDRMs = ["clear"];
  });

  @action.bound
  SetDRM(drm) {
    this.drm = drm;
  }
}

export default VideoStore;
