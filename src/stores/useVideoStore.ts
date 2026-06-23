import { Utils } from "@eluvio/elv-client-js";
import HLSPlayer from "hls.js";
import { create } from "zustand";
import urlJoin from "url-join";

import { useRootStore } from "@/stores/useRootStore";

const searchParams = new URLSearchParams(window.location.search);

let playerProfile = searchParams.get("playerProfile") || "default";
if (playerProfile === "live") {
  playerProfile = "ll";
} else if (!["default", "ll", "ull"].includes(playerProfile)) {
  playerProfile = "default";
}

let initialOffering = "default";
if (searchParams.has("offering")) {
  initialOffering = searchParams.get("offering")!;
} else if (searchParams.has("channel")) {
  initialOffering = `channel--${searchParams.get("channel")}`;
}

export const DISPLAY_MAP: Record<string, string> = {
  "aes-128": "AES-128",
  clear: "Clear",
  dash: "Dash",
  hls: "HLS",
  "sample-aes": "Sample AES",
  widevine: "Widevine",
  fairplay: "FairPlay",
  playready: "PlayReady",
};

export interface PlayerLevel {
  resolution: string;
  bitrate: number;
  qualityIndex?: number;
}

export interface PlayerTrack {
  index: number;
  label: string;
  active?: boolean;
  language?: string;
}

export interface PlayoutMethod {
  playoutUrl: string;
  staticPlayoutUrl?: string;
  globalPlayoutUrl?: string;
  drms?: Record<
    string,
    {
      licenseServers?: string[];
      cert?: string;
    }
  >;
}

export interface PlayoutOptions {
  [protocol: string]: {
    playoutMethods: Record<string, PlayoutMethod>;
  };
}

export interface OfferingInfo {
  display_name?: string;
  properties?: {
    dvr_available?: boolean;
  };
}

interface VideoState {
  loading: boolean;
  error: string;
  loadId: number;
  dashjsSupported: boolean;
  playerProfile: string;
  hlsjsSupported: boolean;
  hlsjsOptions: Record<string, unknown>;
  playoutUrlParams: Record<string, unknown>;
  contentId: string;
  posterUrl: string;
  playoutOptions?: PlayoutOptions;
  title: string;
  bandwidthEstimate: number;
  muted: boolean;
  volume: number;
  playerLevels: PlayerLevel[];
  playerCurrentLevel?: number;
  qualityLevel: number;
  qualityAutoLabel: string;
  playerAudioTracks: PlayerTrack[];
  playerCurrentAudioTrack?: number;
  playerTextTracks: PlayerTrack[];
  playerCurrentTextTrack: number;
  protocol: string;
  drm: string;
  aesOption: string;
  playoutHandler: string;
  offering: string;
  playoutType?: string;
  availableOfferings: Record<string, OfferingInfo>;
  availableChannels: Record<string, OfferingInfo>;
  embedUrl: string;
  srtUrl: string;
  _qualitySetter?: ((level: number) => void) | null;
  metricsSupported: () => boolean;
  setError: (message: string) => void;
  reset: () => void;
  setAuthContext: (context: Record<string, unknown>) => Promise<void>;
  setHlsjsOptions: (options: Record<string, unknown>) => void;
  setPlayoutUrlParams: (params?: Record<string, unknown>) => void;
  setPlayerLevels: (args: { levels: PlayerLevel[]; currentLevel?: number }) => void;
  setQualityLevel: (level: number) => void;
  updateQualityDisplay: (args: { level: number; autoLabel: string }) => void;
  registerQualitySetter: (setter: ((level: number) => void) | null) => void;
  setTextTracks: (args: { tracks?: PlayerTrack[]; currentTrack: number }) => void;
  setAudioTracks: (args: { tracks?: PlayerTrack[]; currentTrack?: number }) => void;
  updateVolume: (event: Event) => void;
  setBandwidthEstimate: (estimate: number) => void;
  setProtocol: (protocol: string) => void;
  setDrm: (drm: string) => void;
  setOffering: (offering: string) => void;
  setPlayoutType: (playoutType: string) => void;
  setPlayoutHandler: (playoutHandler: string) => void;
  setPlayerProfile: (playerProfile: string) => void;
  setMuted: (muted: boolean) => void;
  setAesOption: (aesOption: string) => void;
  loadVideo: (args: { contentId?: string; retry?: boolean }) => Promise<void>;
  reloadPlayout: () => Promise<boolean>;
  loadVideoPlayout: (args: {
    objectId?: string;
    versionHash?: string;
  }) => Promise<boolean>;
  generateEmbedUrl: (args: { objectId?: string; versionHash?: string }) => Promise<void>;
  generateSrtUrl: (args: { libraryId?: string; objectId?: string }) => Promise<void>;
}

const initialVideoState = {
  loading: false,
  error: "",
  loadId: 1,
  dashjsSupported: typeof (window.MediaSource || (window as typeof window & { WebKitMediaSource?: typeof MediaSource }).WebKitMediaSource) === "function",
  playerProfile,
  hlsjsSupported: HLSPlayer.isSupported(),
  hlsjsOptions: Utils.HLSJSSettings({ profile: playerProfile }) as Record<string, unknown>,
  playoutUrlParams: {},
  contentId: "",
  posterUrl: "",
  playoutOptions: undefined,
  title: "",
  bandwidthEstimate: 0,
  muted: false,
  volume: 1,
  playerLevels: [],
  playerCurrentLevel: undefined,
  qualityLevel: -1,
  qualityAutoLabel: "Auto",
  playerAudioTracks: [],
  playerCurrentAudioTrack: undefined,
  playerTextTracks: [],
  playerCurrentTextTrack: -1,
  protocol: "hls",
  drm: "clear",
  aesOption: "aes-128",
  playoutHandler: "playout",
  offering: initialOffering || "default",
  playoutType: undefined,
  availableOfferings: { default: { display_name: "default" } },
  availableChannels: {},
  embedUrl: "",
  srtUrl: "",
};

export const useVideoStore = create<VideoState>((set, get) => ({
  ...initialVideoState,

  metricsSupported: () => {
    const { drm } = get();
    return !["sample-aes", "fairplay"].includes(drm);
  },

  setError: (error) => set({ error }),

  reset: () =>
    set({
      ...initialVideoState,
      hlsjsOptions: get().hlsjsOptions,
      playerProfile: get().playerProfile,
      hlsjsSupported: get().hlsjsSupported,
      dashjsSupported: get().dashjsSupported,
      aesOption: get().aesOption,
    }),

  setAuthContext: async (context) => {
    const client = useRootStore.getState().client as {
      SetAuthContext: (args: { context: Record<string, unknown> }) => Promise<void>;
    } | undefined;

    if (!client) {
      return;
    }

    try {
      await client.SetAuthContext({ context });
      console.log("Set auth context:");
      console.log(JSON.stringify(context, null, 2));
    } catch (error) {
      const message = `Error setting auth context: ${(error as Error).message}`;
      set({ error: message });

      window.setTimeout(() => {
        if (get().error === message) {
          set({ error: "" });
        }
      }, 5000);
    }
  },

  setHlsjsOptions: (hlsjsOptions) => set({ hlsjsOptions }),

  setPlayoutUrlParams: (playoutUrlParams = {}) => set({ playoutUrlParams }),

  setPlayerLevels: ({ levels, currentLevel }) =>
    set({ playerLevels: levels, playerCurrentLevel: currentLevel }),

  setQualityLevel: (level) => {
    get()._qualitySetter?.(level);
  },

  updateQualityDisplay: ({ level, autoLabel }) =>
    set({ qualityLevel: level, qualityAutoLabel: autoLabel }),

  registerQualitySetter: (setter) => set({ _qualitySetter: setter }),

  setTextTracks: ({ tracks, currentTrack }) => {
    if (tracks) {
      set({
        playerTextTracks: tracks.map((track, index) => ({
          ...track,
          label: track.label,
          index: track.index ?? index,
        })),
      });
    }

    set({ playerCurrentTextTrack: currentTrack });
  },

  setAudioTracks: ({ tracks, currentTrack }) => {
    if (tracks) {
      set({ playerAudioTracks: tracks });
    }

    if (typeof currentTrack !== "undefined") {
      set({ playerCurrentAudioTrack: currentTrack });
    }
  },

  updateVolume: (event) => {
    const target = event.target as HTMLVideoElement;
    set({ volume: target.volume, muted: target.muted });
  },

  setBandwidthEstimate: (bandwidthEstimate) => set({ bandwidthEstimate }),

  setProtocol: (protocol) => {
    const { playoutOptions, aesOption, drm } = get();
    let nextDrm = drm;

    if (playoutOptions) {
      const playoutMethods = playoutOptions[protocol].playoutMethods;
      nextDrm = playoutMethods.clear
        ? "clear"
        : playoutMethods[aesOption]
          ? aesOption
          : playoutMethods.widevine
            ? "widevine"
            : "fairplay";
    } else if (drm !== "clear") {
      nextDrm = protocol === "hls" ? aesOption : "widevine";
    }

    set({ protocol, drm: nextDrm });
  },

  setDrm: (drm) => set({ drm }),

  setOffering: (offering) => {
    const contentId = get().contentId;
    get().reset();
    set({ offering, contentId });
    void get().loadVideo({ contentId });
  },

  setPlayoutType: (playoutType) => {
    const previousType = get().playoutType;
    set({ playoutType });

    void (async () => {
      const success = await get().reloadPlayout();
      if (!success) {
        set({ playoutType: previousType });
      }
    })();
  },

  setPlayoutHandler: (playoutHandler) => {
    const previousHandler = get().playoutHandler;
    if (previousHandler === playoutHandler) {
      return;
    }

    set({ playoutHandler });

    void (async () => {
      const success = await get().reloadPlayout();
      if (!success) {
        set({ playoutHandler: previousHandler });
      }
    })();
  },

  setPlayerProfile: (nextProfile) => {
    set({
      playerProfile: nextProfile,
      hlsjsOptions: Utils.HLSJSSettings({ profile: nextProfile }) as Record<string, unknown>,
    });
  },

  setMuted: (muted) => set({ muted }),

  setAesOption: (aesOption) => set({ aesOption }),

  loadVideo: async ({ contentId, retry = true }) => {
    contentId =
      contentId || searchParams.get("objectId") || searchParams.get("versionHash") || "";

    const state = get();
    const client = useRootStore.getState().client;

    if (!client) {
      return;
    }

    if (retry && state.contentId && state.contentId !== contentId) {
      get().reset();
    }

    client.ClearCache();
    set({ error: "" });

    if (!contentId) {
      return;
    }

    contentId = contentId.trim();
    set({ loading: true, contentId });

    try {
      let libraryId: string | undefined;
      let objectId: string | undefined;
      let versionHash: string | undefined;

      if (contentId.startsWith("iq__")) {
        objectId = contentId;
        libraryId = await (
          client as unknown as {
            ContentObjectLibraryId: (args: { objectId: string }) => Promise<string>;
          }
        ).ContentObjectLibraryId({ objectId });
      } else if (contentId.startsWith("hq")) {
        versionHash = contentId;
        objectId = Utils.DecodeVersionHash(versionHash).objectId;
        libraryId = await (
          client as unknown as {
            ContentObjectLibraryId: (args: { objectId: string }) => Promise<string>;
          }
        ).ContentObjectLibraryId({ objectId });
      } else {
        set({ error: `Invalid content ID: ${contentId}`, loading: false });
        return;
      }

      await get().generateEmbedUrl({ versionHash, objectId });

      const title =
        (await (
          client as unknown as {
            ContentObjectMetadata: (args: Record<string, unknown>) => Promise<string>;
          }
        ).ContentObjectMetadata({
          libraryId,
          objectId,
          versionHash,
          metadataSubtree: "public/asset_metadata/display_title",
        })) ||
        (await (
          client as unknown as {
            ContentObjectMetadata: (args: Record<string, unknown>) => Promise<string>;
          }
        ).ContentObjectMetadata({
          libraryId,
          objectId,
          versionHash,
          metadataSubtree: "public/name",
        }));

      const channelMetadata = await (
        client as unknown as {
          ContentObjectMetadata: (args: Record<string, unknown>) => Promise<
            Record<string, { display_name?: string }>
          >;
        }
      ).ContentObjectMetadata({
        libraryId,
        objectId,
        versionHash,
        metadataSubtree: "channel/offerings",
        select: ["*/display_name"],
      });

      let availableChannels: Record<string, OfferingInfo> = {};
      if (channelMetadata) {
        availableChannels = Object.fromEntries(
          Object.keys(channelMetadata).map((channelKey) => [
            channelKey,
            { display_name: channelMetadata[channelKey].display_name },
          ]),
        );
      }

      const availableOfferings = await (
        client as unknown as {
          AvailableOfferings: (args: Record<string, unknown>) => Promise<
            Record<string, OfferingInfo>
          >;
        }
      ).AvailableOfferings({
        objectId,
        versionHash,
      }).catch((error) => {
        console.warn("AvailableOfferings failed:", error);
        return get().availableOfferings;
      });

      let offering = get().offering;
      if (availableOfferings && !availableOfferings[offering]) {
        offering = Object.keys(availableOfferings)[0] || "default";
      }

      set({ title, availableChannels, availableOfferings, offering });
      const playoutLoaded = await get().loadVideoPlayout({ objectId, versionHash });
      if (!playoutLoaded) {
        return;
      }
      await get().generateSrtUrl({ libraryId, objectId });
      set({ loadId: get().loadId + 1 });
    } catch (error) {
      if (retry) {
        await new Promise((resolve) => window.setTimeout(resolve, 2000));
        return get().loadVideo({ contentId, retry: false });
      }

      console.error("Failed to load content:");
      console.error(error);
      get().reset();
      set({ error: "Failed to load content" });
    } finally {
      set({ loading: false });
    }
  },

  reloadPlayout: async () => {
    const state = get();
    const client = useRootStore.getState().client;

    if (!client || !state.contentId || !state.playoutOptions) {
      return true;
    }

    let objectId: string | undefined;
    let versionHash: string | undefined;

    if (state.contentId.startsWith("iq__")) {
      objectId = state.contentId;
    } else if (state.contentId.startsWith("hq")) {
      versionHash = state.contentId;
      objectId = Utils.DecodeVersionHash(versionHash).objectId;
    } else {
      return true;
    }

    set({ loading: true, error: "" });

    const playoutLoaded = await get().loadVideoPlayout({ objectId, versionHash });

    if (playoutLoaded) {
      set({ loadId: get().loadId + 1 });
    }

    set({ loading: false });
    return playoutLoaded;
  },

  loadVideoPlayout: async ({ objectId, versionHash }) => {
    const client = useRootStore.getState().client as unknown as Record<string, unknown> & {
      utils: { DecodeVersionHash: (hash: string) => { objectId: string } };
      PlayoutOptions: (args: Record<string, unknown>) => Promise<PlayoutOptions>;
      Permission: (args: { objectId?: string }) => Promise<string>;
      GlobalUrl: (args: Record<string, unknown>) => Promise<string>;
    };

    if (!client) {
      return false;
    }

    const rootStore = useRootStore.getState();
    const state = get();

    if (versionHash) {
      objectId = client.utils.DecodeVersionHash(versionHash).objectId;
    }

    const isChannel = state.offering.startsWith("channel--");
    let options: Record<string, unknown> = {};

    if (state.playoutUrlParams && Object.keys(state.playoutUrlParams).length > 0) {
      options = state.playoutUrlParams;
    } else if (
      !isChannel &&
      state.availableOfferings?.[state.offering]?.properties?.dvr_available
    ) {
      options = { dvr: 1 };
    }

    let playoutOptions: PlayoutOptions;

    try {
      playoutOptions = await client.PlayoutOptions({
        objectId,
        versionHash,
        handler: isChannel ? "channel" : state.playoutHandler,
        offering: isChannel ? state.offering.replace("channel--", "") : state.offering,
        playoutType: state.playoutType,
        options: JSON.parse(JSON.stringify(options)),
      });
    } catch (error) {
      console.error("PlayoutOptions failed:", error);
      set({
        error:
          state.playoutHandler === "playout_scte"
            ? "SCTE playout handler is not available for this content"
            : "Failed to load playout options",
      });
      return false;
    }

    if (!playoutOptions || Object.keys(playoutOptions).length === 0) {
      set({
        error:
          state.playoutHandler === "playout_scte"
            ? "SCTE playout handler is not available for this content"
            : "No playout options available",
      });
      return false;
    }

    let protocol = state.protocol;
    if (!playoutOptions[protocol]) {
      protocol = Object.keys(playoutOptions)[0] || "hls";
    }

    const currentProtocolDrms = Object.keys(
      playoutOptions[protocol]?.playoutMethods || {},
    ).filter((drm) => rootStore.availableDRMs.includes(drm));

    if (currentProtocolDrms.length === 0) {
      const switchedProtocol = protocol === "hls" ? "dash" : "hls";

      if (Object.prototype.hasOwnProperty.call(playoutOptions, switchedProtocol)) {
        protocol = switchedProtocol;
      } else {
        set({ error: "No playout formats compatible with this browser are available." });
        return false;
      }
    }

    let drm = state.drm;
    const playoutMethods = playoutOptions[protocol]?.playoutMethods;

    if (!playoutMethods) {
      set({ error: "No playout formats compatible with this browser are available." });
      return false;
    }

    if (!playoutMethods[drm]) {
      if (playoutMethods.clear) {
        drm = "clear";
      } else if (playoutMethods[state.aesOption]) {
        drm = state.aesOption;
      } else if (playoutMethods.widevine) {
        drm = "widevine";
      } else if (playoutMethods.fairplay) {
        drm = "fairplay";
      } else if (playoutMethods.playready) {
        drm = "playready";
      } else {
        set({ error: "No playout formats compatible with this browser are available." });
        return false;
      }
    }

    const publiclyAccessible = ["listable", "public"].includes(
      await client.Permission({ objectId }),
    );

    if (publiclyAccessible) {
      for (const protocolKey of Object.keys(playoutOptions)) {
        for (const drmKey of Object.keys(
          playoutOptions[protocolKey].playoutMethods || {},
        )) {
          try {
            const method = playoutOptions[protocolKey].playoutMethods[drmKey];
            let playoutUrl = new URL(method.playoutUrl);
            playoutUrl = new URL(playoutUrl.toString());
            playoutUrl.searchParams.delete("authorization");
            method.staticPlayoutUrl = playoutUrl.toString();

            let path = urlJoin("rep", playoutUrl.pathname.split("/rep")[1]);
            if (playoutUrl.pathname.includes("/meta")) {
              path = urlJoin("meta", playoutUrl.pathname.split("/meta")[1]);
            }

            const queryParams: Record<string, string> = {};
            playoutUrl.searchParams.forEach((value, key) => {
              queryParams[key] = value;
            });

            method.globalPlayoutUrl = await client.GlobalUrl({
              objectId,
              path,
              queryParams,
              noAuth: true,
              resolve: false,
            });
          } catch (error) {
            console.error(error);
          }
        }
      }
    }

    set({ playoutOptions, protocol, drm });
    return true;
  },

  generateEmbedUrl: async ({ objectId, versionHash }) => {
    const client = useRootStore.getState().client as unknown as Record<string, unknown> & {
      Permission: (args: { objectId?: string }) => Promise<string>;
      CallContractMethod: (args: Record<string, unknown>) => Promise<boolean>;
      EmbedUrl: (args: Record<string, unknown>) => Promise<string>;
    };

    if (!client) {
      return;
    }

    const rootStore = useRootStore.getState();
    const state = get();

    if (!objectId && versionHash) {
      objectId = Utils.DecodeVersionHash(versionHash).objectId;
    }

    if (!objectId) {
      return;
    }

    const publiclyAccessible = ["listable", "public"].includes(
      await client.Permission({ objectId }),
    );

    if (!publiclyAccessible) {
      const canEdit = await client.CallContractMethod({
        contractAddress: Utils.HashToAddress(objectId),
        methodName: "canEdit",
      });

      if (!canEdit) {
        return;
      }
    }

    let embedUrl = new URL(
      await client.EmbedUrl({
        objectId,
        versionHash,
        mediaType: ["ll", "ull"].includes(state.playerProfile) ? "live_video" : "video",
        duration: 7 * 24 * 60 * 60 * 1000,
      }),
    );

    if (state.offering.startsWith("channel--")) {
      embedUrl.searchParams.set("ch", state.offering.replace("channel--", ""));
    } else {
      embedUrl.searchParams.set("off", state.offering);
    }

    if (
      JSON.stringify(state.hlsjsOptions) ===
      JSON.stringify(Utils.HLSJSSettings({ profile: "ull" }))
    ) {
      embedUrl.searchParams.set("prf", "ull");
    } else if (
      JSON.stringify(state.hlsjsOptions) ===
      JSON.stringify(Utils.HLSJSSettings({ profile: "ll" }))
    ) {
      embedUrl.searchParams.set("prf", "ll");
    } else if (state.hlsjsOptions && Object.keys(state.hlsjsOptions).length > 0) {
      if (
        JSON.stringify(state.hlsjsOptions) !==
        JSON.stringify(Utils.HLSJSSettings({ profile: "default" }))
      ) {
        embedUrl.searchParams.set("hls", Utils.B58(JSON.stringify(state.hlsjsOptions)));
      }
    }

    if (state.playoutUrlParams && Object.keys(state.playoutUrlParams).length > 0) {
      embedUrl.searchParams.set("opt", Utils.B58(JSON.stringify(state.playoutUrlParams)));
    }

    const customFabricNode =
      rootStore.fabricNode === "custom" ? rootStore.customFabricNode : rootStore.fabricNode;

    if (customFabricNode) {
      embedUrl.searchParams.set("node", customFabricNode);
    }

    set({ embedUrl: embedUrl.toString() });
  },

  generateSrtUrl: async ({ libraryId, objectId }) => {
    const client = useRootStore.getState().client as unknown as Record<string, unknown> & {
      ContentObjectLibraryId: (args: { objectId: string }) => Promise<string>;
      ContentObjectMetadata: (args: Record<string, unknown>) => Promise<
        | {
            srt_egress_enabled?: boolean;
            url?: string;
          }
        | undefined
      >;
      Permission: (args: { objectId?: string }) => Promise<string>;
      CreateSignedToken: (args: { objectId?: string; duration: number }) => Promise<string>;
      ContentSpaceId: () => Promise<string>;
      utils: { B64: (value: string) => string };
    };

    if (!client || !objectId) {
      return;
    }

    const rootStore = useRootStore.getState();
    const state = get();

    try {
      if (!libraryId) {
        libraryId = await client.ContentObjectLibraryId({ objectId });
      }

      if (!libraryId) {
        return;
      }

      const srtInfo =
        (await client.ContentObjectMetadata({
          libraryId,
          objectId,
          metadataSubtree: "live_recording_config",
          select: ["srt_egress_enabled", "url"],
        })) || {};

      const { srt_egress_enabled, url: originUrl } = srtInfo;

      if (!srt_egress_enabled || !originUrl) {
        return;
      }

      const playoutInfo = state.playoutOptions?.[state.protocol]?.playoutMethods[state.drm];
      const playoutUrl = playoutInfo?.staticPlayoutUrl || playoutInfo?.playoutUrl;

      let nodeUrl: string;
      if (rootStore.fabricNode === "") {
        nodeUrl = playoutUrl || originUrl;
      } else if (rootStore.fabricNode === "custom") {
        nodeUrl = rootStore.customFabricNode;
      } else {
        nodeUrl = rootStore.fabricNode || originUrl;
      }

      const urlObject = new URL(nodeUrl);
      const url = new URL(`srt://${urlObject.hostname}:11080`);

      const permission = await client.Permission({ objectId });
      let token = "";

      if (["owner", "editable", "viewable"].includes(permission)) {
        token = await client.CreateSignedToken({
          objectId,
          duration: 86400000,
        });
      } else {
        const contentSpaceId = await client.ContentSpaceId();
        token = client.utils.B64(JSON.stringify({ qspace_id: contentSpaceId }));
      }

      url.searchParams.set("streamid", `live-ts.${objectId}${token ? `.${token}` : ""}`);
      set({ srtUrl: url.toString() });
    } catch (error) {
      console.error(error);
    }
  },
}));
