import {observable, action, flow, runInAction, computed} from "mobx";
import HLSPlayer from "hls.js";
import {Utils} from "@eluvio/elv-client-js";
import UrlJoin from "url-join";

const searchParams = new URLSearchParams(window.location.search);

let playerProfile = searchParams.get("playerProfile") || "default";
if(playerProfile === "live") {
  playerProfile = "ll";
} else if(!["default", "ll", "ull"].includes(playerProfile)) {
  playerProfile = "default";
}

let initialOffering = "default";
if(searchParams.has("offering")) {
  initialOffering = searchParams.get("offering");
} else if(searchParams.has("channel")) {
  initialOffering = `channel--${searchParams.get("channel")}`;
}

class VideoStore {
  @observable loading = false;
  @observable error = "";

  @observable loadId = 1;
  @observable dashjsSupported = typeof (window.MediaSource || window.WebKitMediaSource) === "function";
  @observable playerProfile = playerProfile
  @observable hlsjsSupported = HLSPlayer.isSupported();
  @observable hlsjsOptions = Utils.HLSJSSettings({profile: playerProfile});
  @observable contentId;
  @observable posterUrl;
  @observable playoutOptions;
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

  @observable protocol = "hls";
  @observable drm = "clear";
  @observable aesOption = "aes-128";

  @observable playoutHandler = "playout";
  @observable offering = initialOffering || "default";
  @observable playoutType;
  @observable availableOfferings = {default: { display_name: "default" }};
  @observable availableChannels = {};
  @observable embedUrl = "";
  @observable srtUrl = "";

  constructor(rootStore) {
    this.rootStore = rootStore;

    this.displayMap = {
      "aes-128": "AES-128",
      "clear": "Clear",
      "dash": "Dash",
      "hls": "HLS",
      "sample-aes": "Sample AES",
      "widevine": "Widevine",
      "fairplay": "FairPlay",
      "playready": "PlayReady",
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
    this.embedUrl = "";

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
  SetHLSJSOptions(options) {
    this.hlsjsOptions = options;
  }

  @action.bound
  SetPlayerLevels({levels, currentLevel}) {
    this.playerLevels = levels;
    this.playerCurrentLevel = currentLevel;
  }

  @action.bound
  SetTextTracks({tracks, currentTrack}) {
    if(tracks) {
      this.playerTextTracks = tracks.map((track, index) => {
        return {
          ...track,
          label: track.label,
          index: track.index || index
        };
      });
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
      this.drm = playoutMethods.clear ? "clear" : (playoutMethods[this.aesOption] ? this.aesOption : playoutMethods.widevine ? "widevine" : "fairplay");
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

    this.LoadVideo({contentId: this.contentId});
  }

  @action.bound
  SetPlayoutType(playoutType) {
    this.playoutType = playoutType;
  }

  @action.bound
  SetPlayerProfile(playerProfile) {
    this.playerProfile = playerProfile;

    this.hlsjsOptions = Utils.HLSJSSettings({profile: playerProfile});
  }

  @action.bound
  LoadVideo = flow(function * ({contentId, retry=true}) {
    contentId = contentId || searchParams.get("objectId") || searchParams.get("versionHash");

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

      this.GenerateEmbedUrl({versionHash, objectId});

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

      const channelMetadata = (yield client.ContentObjectMetadata({
        libraryId,
        objectId,
        versionHash,
        metadataSubtree: "channel/offerings",
        select: [
          "*/display_name"
        ]
      }));

      if(channelMetadata) {
        let availableChannels = {};

        Object.keys(channelMetadata).map(channelKey =>
          availableChannels[channelKey] = {display_name: channelMetadata[channelKey].display_name}
        );

        this.availableChannels = availableChannels;
      }

      this.availableOfferings = yield client.AvailableOfferings({
        objectId,
        versionHash,
        handler: this.playoutHandler
      });

      yield this.LoadVideoPlayout({objectId, versionHash});
      this.GenerateSrtUrl({libraryId, objectId});

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
    if(versionHash) {
      objectId = this.rootStore.client.utils.DecodeVersionHash(versionHash).objectId;
    }

    const isChannel = this.offering.startsWith("channel--");
    const playoutOptions = yield this.rootStore.client.PlayoutOptions({
      objectId,
      versionHash,
      handler: isChannel ? "channel" : this.playoutHandler,
      offering: isChannel ? this.offering.replace("channel--", "") : this.offering,
      playoutType: this.playoutType,
      options: !isChannel && this.availableOfferings?.[this.offering]?.properties?.dvr_available ?
        {dvr: 1} : {}
    });

    if(!playoutOptions[this.protocol]) {
      this.protocol = Object.keys(playoutOptions)[0] || "hls";
    }

    // If no suitable DRMs in current protocol, switch to other protocol
    if(!Object.keys(playoutOptions[this.protocol].playoutMethods).find(drm => this.rootStore.availableDRMs.includes(drm))) {
      const switchedProtocol = this.protocol === "hls" ? "dash" : "hls";

      if(playoutOptions.hasOwnProperty(switchedProtocol)) {
        this.SetProtocol(switchedProtocol);
      } else {
        this.SetError("No playout formats compatible with this browser are available.");
        return;
      }
    }

    // If current DRM is not suitable, switch
    if(!playoutOptions[this.protocol].playoutMethods[this.drm]) {
      // Prefer DRM
      const playoutMethods = playoutOptions[this.protocol].playoutMethods;
      if(playoutMethods.clear) {
        this.drm = "clear";
      } else if(playoutMethods[this.aesOption]) {
        this.drm = this.aesOption;
      } else if(playoutMethods.widevine) {
        this.drm = "widevine";
      } else if(playoutMethods.fairplay) {
        this.drm = "fairplay";
      } else if(playoutMethods.playready) {
        this.drm = "playready";
      } else {
        this.SetError("No playout formats compatible with this browser are available.");
        return;
      }
    }

    const publiclyAccessible = ["listable", "public"].includes(yield this.rootStore.client.Permission({objectId}));
    if(publiclyAccessible) {
      // If publicly accessible, create display urls with no auth/static tokens
      const libraryId = yield this.rootStore.client.ContentObjectLibraryId({objectId});
      const staticToken = Utils.B64(JSON.stringify({qspace_id: yield this.rootStore.client.ContentSpaceId(), qlib_id: libraryId}));

      for(const protocol of Object.keys(playoutOptions)) {
        for(const drm of Object.keys(playoutOptions[protocol].playoutMethods || {})) {
          try {
            let playoutUrl = new URL(playoutOptions[protocol].playoutMethods[drm].playoutUrl);

            playoutUrl = new URL(playoutUrl);
            playoutUrl.searchParams.set("authorization", staticToken);
            playoutOptions[protocol].playoutMethods[drm].staticPlayoutUrl = playoutUrl.toString();

            let path = UrlJoin("rep", playoutUrl.pathname.split("/rep")[1]);
            if(playoutUrl.pathname.includes("/meta")) {
              path = UrlJoin("meta", playoutUrl.pathname.split("/meta")[1]);
            }

            playoutOptions[protocol].playoutMethods[drm].globalPlayoutUrl = yield this.rootStore.client.GlobalUrl({
              objectId,
              path,
              noAuth: true,
              resolve: false
            });
          } catch(error) {
            // eslint-disable-next-line no-console
            console.error(error);
          }
        }
      }
    }

    this.playoutOptions = playoutOptions;
  });

  @action.bound
  GenerateEmbedUrl = flow(function * ({objectId, versionHash}) {
    const publiclyAccessible = ["listable", "public"].includes(yield this.rootStore.client.Permission({objectId}));

    if(!publiclyAccessible) {
      // Current user must be an editor of the content in order to create a token for it
      objectId = objectId || Utils.DecodeVersionHash(versionHash).objectId;
      const canEdit = yield this.rootStore.client.CallContractMethod({
        contractAddress: Utils.HashToAddress(objectId),
        methodName: "canEdit"
      });

      if(!canEdit) {
        return;
      }
    }

    let embedUrl = new URL(
      yield this.rootStore.client.EmbedUrl({
        objectId,
        versionHash,
        mediaType: ["ll", "ull"].includes(this.playerProfile) ? "live_video" : "video",
        duration: 7 * 24 * 60 * 60 * 1000
      })
    );

    if(this.offering.startsWith("channel--")) {
      embedUrl.searchParams.set("ch", this.offering.replace("channel--", ""));
    } else {
      embedUrl.searchParams.set("off", this.offering);
    }

    if(JSON.stringify(this.hlsjsOptions) === JSON.stringify(Utils.HLSJSSettings({profile: "ull"}))) {
      // Matches ultra low latency profile
      embedUrl.searchParams.set("prf", "ull");
    } else if(JSON.stringify(this.hlsjsOptions) === JSON.stringify(Utils.HLSJSSettings({profile: "ll"}))) {
      // Matches low latency profile
      embedUrl.searchParams.set("prf", "ll");
    } else if(this.hlsjsOptions && Object.keys(this.hlsjsOptions).length > 0) {
      if(JSON.stringify(this.hlsjsOptions) !== JSON.stringify(Utils.HLSJSSettings({profile: "default"}))) {
        // Settings present but does not match default profile
        embedUrl.searchParams.set("hls", Utils.B58(JSON.stringify(this.hlsjsOptions)));
      }
    }

    const customFabricNode = this.rootStore.fabricNode === "custom" ?
      this.rootStore.customFabricNode :
      this.rootStore.fabricNode;
    if(customFabricNode) {
      embedUrl.searchParams.set("node", customFabricNode);
    }

    this.embedUrl = embedUrl.toString();
  });

  @action.bound
  GenerateSrtUrl = flow(function * ({libraryId, objectId}){
    try {
      const {srt_egress_enabled, url: originUrl} = yield this.rootStore.client.ContentObjectMetadata({
        libraryId,
        objectId,
        metadataSubtree: "live_recording_config",
        select: [
          "srt_egress_enabled",
          "url"
        ]
      });

      if(!srt_egress_enabled || !originUrl) { return; }


      let nodeUrl;
      const playoutInfo = this.playoutOptions?.[this.protocol]
        ?.playoutMethods[this.drm];
      const playoutUrl = playoutInfo.staticPlayoutUrl || playoutInfo.playoutUrl;

      if(this.rootStore.fabricNode === "") {
        nodeUrl = playoutUrl || originUrl;
      } else if(this.rootStore.fabricNode === "custom") {
        nodeUrl = this.rootStore.customFabricNode;
      } else {
        nodeUrl = (this.rootStore.fabricNode || originUrl);
      }

      const urlObject = new URL(nodeUrl);

      if(!urlObject) {
        // eslint-disable-next-line no-console
        console.error(`Invalid origin url: ${originUrl}`);
        return "";
      }

      let token = "";
      const url = new URL(`srt://${urlObject.hostname}:11080`);

      const permission = yield this.rootStore.client.Permission({
        objectId
      });

      if(["owner", "editable", "viewable"].includes(permission)) {
        token = yield this.rootStore.client.CreateSignedToken({
          objectId,
          duration: 86400000
        });
      } else {
        const contentSpaceId = yield this.rootStore.client.ContentSpaceId();
        token = this.rootStore.client.utils.B64(
          JSON.stringify({ qspace_id: contentSpaceId })
        );
      }

      url.searchParams.set("streamid", `live-ts.${objectId}${token ? `.${token}` : ""}`);

      this.srtUrl = url.toString();
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error(error);
      return "";
    }
  });
}

export default VideoStore;
