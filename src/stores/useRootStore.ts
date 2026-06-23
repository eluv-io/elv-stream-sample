import { FrameClient } from "@eluvio/elv-client-js/src/FrameClient";
import { create } from "zustand";

import { getEluvioConfiguration } from "@/lib/utils";
import { useVideoStore } from "@/stores/useVideoStore";

type ElvClientInstance = Record<string, unknown> & {
  ClearCache: () => void;
  Nodes: () => Promise<{
    fabricURIs: string[];
    ethereumURIs: string[];
  }>;
  AvailableDRMs: () => Promise<string[]>;
  UseRegion: (args: { region: string }) => Promise<void>;
  ResetRegion: () => Promise<void>;
  SetNodes: (args: { fabricURIs?: string[]; ethereumURIs?: string[] }) => Promise<void>;
  SendMessage: (args: { options: { operation: string }; noResponse?: boolean }) => void;
};

interface RootState {
  initialLoadComplete: boolean;
  client?: ElvClientInstance;
  nodes?: {
    fabricURIs: string[];
    ethereumURIs: string[];
  };
  availableDRMs: string[];
  region: string;
  fabricNode: string;
  customFabricNode: string;
  ethNode: string;
  devMode: boolean;
  displayAppMode: boolean;
  initializeClient: () => Promise<void>;
  setFabricNode: (fabricNode: string) => void;
  setCustomFabricNode: (fabricNode: string) => void;
  setEthNode: (ethNode: string) => void;
  setRegion: (region: string) => Promise<void>;
  toggleDevMode: (enable: boolean) => void;
  returnToApps: () => void;
}

const searchParams = new URLSearchParams(window.location.search);

export const useRootStore = create<RootState>((set, get) => ({
  initialLoadComplete: false,
  client: undefined,
  nodes: undefined,
  availableDRMs: [],
  region: "",
  fabricNode: "",
  customFabricNode: "",
  ethNode: "",
  devMode: searchParams.has("dev"),
  displayAppMode: searchParams.has("action"),

  initializeClient: async () => {
    const state = get();
    let client: ElvClientInstance;

    if (window.self === window.top) {
      const { ElvClient } = await import("@eluvio/elv-client-js");
      const config = getEluvioConfiguration();

      client = (await ElvClient.FromConfigurationUrl({
        configUrl: config["config-url"] as string,
        region: state.region,
      })) as ElvClientInstance;

      await (client as unknown as {
        SetStaticToken: (args: { token: string }) => Promise<void>;
        CreateFabricToken: () => Promise<string>;
      }).SetStaticToken({
        token: await (
          client as unknown as { CreateFabricToken: () => Promise<string> }
        ).CreateFabricToken(),
      });
    } else {
      client = new FrameClient({
        target: window.parent,
        timeout: 30,
      }) as unknown as ElvClientInstance;

      if (state.region) {
        await client.UseRegion({ region: state.region });
      } else {
        await client.ResetRegion();
      }

      if (!state.initialLoadComplete) {
        client.SendMessage({ options: { operation: "HideHeader" }, noResponse: true });
      }
    }

    let nodes = await client.Nodes();
    const fabricNode =
      state.fabricNode === "custom" ? state.customFabricNode : state.fabricNode;

    if (fabricNode) {
      await client.SetNodes({ fabricURIs: [fabricNode] });

      if (!nodes.fabricURIs.find((uri) => uri === fabricNode)) {
        nodes = {
          ...nodes,
          fabricURIs: [...nodes.fabricURIs, fabricNode],
        };
      }
    }

    if (state.ethNode) {
      await client.SetNodes({ ethereumURIs: [state.ethNode] });

      if (!nodes.ethereumURIs.find((uri) => uri === state.ethNode)) {
        nodes = {
          ...nodes,
          ethereumURIs: [...nodes.ethereumURIs, state.ethNode],
        };
      }
    }

    const availableDRMs = await client.AvailableDRMs();
    const videoStore = useVideoStore.getState();

    if (availableDRMs.includes("sample-aes")) {
      videoStore.setAesOption("sample-aes");
    }

    set({ nodes, availableDRMs, client });
    window.client = client;

    if (!state.initialLoadComplete) {
      const urlParams = new URLSearchParams(window.location.search);
      const pathParams = (window.location.hash || "")
        .replace(/^#/, "")
        .replace(/^\//, "")
        .split("/");
      const initialContentId =
        urlParams.get("objectId") ||
        urlParams.get("versionHash") ||
        urlParams.get("contentId") ||
        pathParams[0];
      const initialOffering = urlParams.get("offering") || pathParams[1];
      const config = getEluvioConfiguration();

      if (initialContentId) {
        videoStore.setMuted(true);

        if (initialOffering) {
          videoStore.setOffering(initialOffering);
        }

        await videoStore.loadVideo({ contentId: initialContentId });
      } else if (
        !get().displayAppMode &&
        config.availableContent &&
        config.availableContent.length > 0
      ) {
        videoStore.setMuted(true);
        await videoStore.loadVideo({
          contentId: config.availableContent[0].versionHash,
        });
      }
    }

    set({ initialLoadComplete: true });
  },

  setFabricNode: (fabricNode) => set({ fabricNode }),

  setCustomFabricNode: (customFabricNode) => set({ customFabricNode }),

  setEthNode: (ethNode) => set({ ethNode }),

  setRegion: async (region) => {
    const { client } = get();
    if (!client) {
      return;
    }

    set({ region, fabricNode: "", customFabricNode: "" });
    await client.UseRegion({ region });
    const nodes = await client.Nodes();
    set({ nodes });
  },

  toggleDevMode: (devMode) => set({ devMode }),

  returnToApps: () => {
    get().client?.SendMessage({
      options: { operation: "ShowAppsPage" },
      noResponse: true,
    });
  },
}));
