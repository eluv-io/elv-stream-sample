declare module "mux-embed";

declare module "@eluvio/elv-client-js";
declare module "@eluvio/elv-client-js/src/FrameClient";

interface WebKitMediaKeys {
  createSession: (type: string, initData: ArrayBuffer) => WebKitMediaKeySession | null;
}

interface WebKitMediaKeySession {
  contentId?: string;
  update: (key: Uint8Array) => Promise<void>;
  addEventListener: (
    type: string,
    listener: (event: Event) => void,
    useCapture?: boolean,
  ) => void;
}

interface HTMLVideoElement {
  webkitKeys?: WebKitMediaKeys;
  webkitSetMediaKeys?: (keys: WebKitMediaKeys) => void;
}

declare var WebKitMediaKeys: {
  new (keySystem: string): WebKitMediaKeys;
  isTypeSupported: (keySystem: string, type: string) => boolean;
};

declare var WebKitMediaKeySession: {
  prototype: WebKitMediaKeySession;
};
