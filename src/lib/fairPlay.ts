const uint8ArrayToBase64 = (input: Uint8Array) => {
  const keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  let output = "";
  let chr1: number;
  let chr2: number;
  let chr3: number;
  let enc1: number;
  let enc2: number;
  let enc3: number;
  let enc4: number;
  let i = 0;

  while (i < input.length) {
    chr1 = input[i++];
    chr2 = i < input.length ? input[i++] : Number.NaN;
    chr3 = i < input.length ? input[i++] : Number.NaN;

    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;

    if (Number.isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (Number.isNaN(chr3)) {
      enc4 = 64;
    }

    output +=
      keyStr.charAt(enc1) +
      keyStr.charAt(enc2) +
      keyStr.charAt(enc3) +
      keyStr.charAt(enc4);
  }

  return output;
};

const base64ToUInt8Array = (input: string) => {
  const raw = window.atob(input);
  const rawLength = raw.length;
  const array = new Uint8Array(new ArrayBuffer(rawLength));

  for (let i = 0; i < rawLength; i++) {
    array[i] = raw.charCodeAt(i);
  }

  return array;
};

const stringToArray = (string: string) => {
  const buffer = new ArrayBuffer(string.length * 2);
  const array = new Uint16Array(buffer);

  for (let i = 0, strLen = string.length; i < strLen; i++) {
    array[i] = string.charCodeAt(i);
  }

  return array;
};

const arrayToString = (array: Uint16Array) => {
  return String.fromCharCode.apply(null, Array.from(array));
};

const contentIdFromInitData = (initData: ArrayBuffer) => {
  const contentId = arrayToString(new Uint16Array(initData)).slice(2);
  const link = document.createElement("a");
  link.href = contentId;
  return link.hostname;
};

const concatInitDataIdAndCertificate = (
  initData: ArrayBuffer,
  id: string | Uint16Array,
  cert: Uint8Array,
) => {
  const idArray = typeof id === "string" ? stringToArray(id) : id;
  let offset = 0;
  const buffer = new ArrayBuffer(
    initData.byteLength + 4 + idArray.byteLength + 4 + cert.byteLength,
  );
  const dataView = new DataView(buffer);
  const initDataArray = new Uint8Array(buffer, offset, initData.byteLength);
  initDataArray.set(new Uint8Array(initData));
  offset += initData.byteLength;

  dataView.setUint32(offset, idArray.byteLength, true);
  offset += 4;

  const idTarget = new Uint16Array(buffer, offset, idArray.length);
  idTarget.set(idArray);
  offset += idTarget.byteLength;

  dataView.setUint32(offset, cert.byteLength, true);
  offset += 4;

  const certArray = new Uint8Array(buffer, offset, cert.byteLength);
  certArray.set(cert);

  return new Uint8Array(buffer, 0, buffer.byteLength);
};

const keySystem = () => {
  const webkitMediaKeys = (window as typeof window & {
    WebKitMediaKeys?: { isTypeSupported: (keySystem: string, type: string) => boolean };
  }).WebKitMediaKeys;

  if (webkitMediaKeys?.isTypeSupported("com.apple.fps.1_0", "video/mp4")) {
    return "com.apple.fps.1_0";
  }

  throw new Error("Key System not supported");
};

const licenseRequestReady = async (
  event: Event & { message?: ArrayBuffer; target: EventTarget | null },
  licenseURLs: string[],
  authToken: string,
) => {
  for (const licenseURL of licenseURLs) {
    try {
      const response = await new Promise<Event>((resolve, reject) => {
        const session = event.target as unknown as WebKitMediaKeySession & {
          contentId?: string;
        };
        const message = event.message!;
        const request = new XMLHttpRequest();
        request.responseType = "text";
        (request as XMLHttpRequest & { session: typeof session }).session = session;
        request.addEventListener("load", resolve, false);
        request.addEventListener("error", reject, false);

        const params = {
          spc: uint8ArrayToBase64(new Uint8Array(message)),
          assetId: encodeURIComponent(session.contentId || ""),
        };

        request.open("POST", licenseURL, true);
        request.setRequestHeader("Content-type", "application/json");
        request.setRequestHeader("Authorization", `Bearer ${authToken}`);
        request.send(JSON.stringify(params));
      });

      const request = response.target as XMLHttpRequest & {
        session: WebKitMediaKeySession;
      };
      const session = request.session;
      let keyText = request.responseText.trim();

      if (keyText.startsWith("<ckc>") && keyText.endsWith("</ckc>")) {
        keyText = keyText.slice(5, -6);
      }

      const key = base64ToUInt8Array(keyText);
      await session.update(key);
      return;
    } catch (error) {
      console.error("License request to", licenseURL, "failed");
      console.error(error);
    }
  }

  throw new Error("All license server requests failed");
};

const onNeedKey = async (
  event: Event & { initData?: ArrayBuffer; target: EventTarget | null },
  certificate: string,
  licenseURLs: string[],
  authToken: string,
) => {
  const cert = base64ToUInt8Array(certificate);
  const video = event.target as HTMLVideoElement & {
    webkitKeys?: WebKitMediaKeys;
    webkitSetMediaKeys?: (keys: WebKitMediaKeys) => void;
  };

  let initData = event.initData!;
  const contentId = contentIdFromInitData(initData);
  initData = concatInitDataIdAndCertificate(initData, contentId, cert).buffer;

  if (!video.webkitKeys) {
    video.webkitSetMediaKeys?.(
      new (window as typeof window & { WebKitMediaKeys: new (keySystem: string) => WebKitMediaKeys }).WebKitMediaKeys(
        keySystem(),
      ),
    );
  }

  if (!video.webkitKeys) {
    throw new Error("Could not create MediaKeys");
  }

  const keySession = video.webkitKeys.createSession("video/mp4", initData);
  if (!keySession) {
    throw new Error("Could not create key session");
  }

  (keySession as WebKitMediaKeySession & { contentId?: string }).contentId = contentId;

  const keyMessageEvent = await Promise.race([
    new Promise<undefined>((resolve) => window.setTimeout(() => resolve(undefined), 10000)),
    new Promise<Event>((resolve) =>
      keySession.addEventListener("webkitkeymessage", resolve, false),
    ),
  ]);

  if (!keyMessageEvent) {
    throw new Error("No key message event");
  }

  await licenseRequestReady(
    keyMessageEvent as Event & { message?: ArrayBuffer; target: EventTarget | null },
    licenseURLs,
    authToken,
  );
};

import type { PlayoutOptions } from "@/stores/useVideoStore";

export function initializeFairPlayStream({
  playoutOptions,
  video,
}: {
  playoutOptions: PlayoutOptions;
  video: HTMLVideoElement;
}) {
  const fairplay = playoutOptions.hls.playoutMethods.fairplay;
  const cert = fairplay.drms?.fairplay?.cert;
  const licenseURLs = fairplay.drms?.fairplay?.licenseServers || [];
  const authParam = (fairplay.playoutUrl.split("?")[1] || "")
    .split("&")
    .find((param) => param.startsWith("authorization="));

  const authToken = decodeURIComponent(authParam?.replace("authorization=", "") || "");

  new Promise<void>((resolve, reject) => {
    video.addEventListener(
      "webkitneedkey",
      async (event) => {
        try {
          await onNeedKey(
            event as Event & { initData?: ArrayBuffer; target: EventTarget | null },
            cert || "",
            licenseURLs,
            authToken,
          );
          resolve();
        } catch (error) {
          reject(error);
        }
      },
      false,
    );
  }).catch((error) => {
    console.log("Error initializing FairPlay video:");
    console.log(error);
    video.src = "";
  });

  video.src = fairplay.playoutUrl;
}
