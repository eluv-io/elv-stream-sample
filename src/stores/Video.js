import {observable, action, flow} from "mobx";

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
  LoadVideo = flow(function * ({versionHash, protocol}) {
    this.loading = true;
    this.error = undefined;

    const client = this.rootStore.client;

    try {
      const { objectId } = client.utils.DecodeVersionHash(versionHash);

      const metadata = yield client.ContentObjectMetadata({versionHash});

      const playoutOptions = yield client.PlayoutOptions({
        versionHash,
        protocols: [protocol],
        drms: yield this.rootStore.AvailableDRMs()
      });

      const availableDRMs = Object.keys(playoutOptions[protocol].drms);

      const posterUrl = yield client.Rep({
        versionHash,
        rep: "player_background",
        channelAuth: true
      });

      const authToken = yield client.GenerateStateChannelToken({objectId});

      this.metadata = metadata;
      this.playoutOptions = playoutOptions;
      this.availableDRMs = availableDRMs;
      this.posterUrl = posterUrl;
      this.authToken = authToken;
      this.protocol = protocol;
      this.drm = availableDRMs[0];
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
  SetDRM(drm) {
    this.drm = drm;
  }
}

export default VideoStore;
