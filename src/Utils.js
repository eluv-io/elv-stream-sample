import {ElvClient} from "elv-client-js";

export const InitializeClient = async () => {
  const client = await ElvClient.FromConfigurationUrl({
    configUrl: "https://main.net955304.contentfabric.io/config",
    viewOnly: true
  });

  const wallet = client.GenerateWallet();
  const mnemonic = wallet.GenerateMnemonic();
  const signer = wallet.AddAccountFromMnemonic({mnemonic});

  await client.SetSigner({signer});

  return client;
};

// Check browser capabilities to determine widevine support
export const AvailableDRMs = async () => {
  const availableDRMs = ["aes-128"];

  if (typeof window.navigator.requestMediaKeySystemAccess !== "function") {
    // eslint-disable-next-line no-console
    console.log("requestMediaKeySystemAccess not available");

    return availableDRMs;
  }

  try {
    const config = [{
      initDataTypes: ["cenc"],
      audioCapabilities: [{
        contentType: "audio/mp4;codecs=\"mp4a.40.2\""
      }],
      videoCapabilities: [{
        contentType: "video/mp4;codecs=\"avc1.42E01E\""
      }]
    }];

    await navigator.requestMediaKeySystemAccess("com.widevine.alpha", config);

    availableDRMs.push("widevine");
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("No Widevine support detected");
  }

  return availableDRMs;
};

export const LoadVideo = async ({client, versionHash, drm}) => {
  const { objectId } = client.utils.DecodeVersionHash(versionHash);

  if(objectId.length !== 32) {
    throw new Error("Invalid version hash");
  }

  try {
    const metadata = await client.ContentObjectMetadata({versionHash});

    const playoutOptions = await client.PlayoutOptions({
      versionHash,
      protocols: ["dash", "hls"],
      drms: drm ? [drm] : []
    });

    const posterUrl = await client.Rep({
      versionHash,
      rep: "player_background",
      channelAuth: true
    });

    const authToken = await client.GenerateStateChannelToken({objectId});

    return {
      metadata,
      playoutOptions,
      posterUrl,
      authToken
    };
  } catch(error) {
    // eslint-disable-next-line no-console
    console.error("Failed to load content:");
    // eslint-disable-next-line no-console
    console.error(error);

    throw new Error("Failed to load content");
  }
};

export function CalculateHTTPMetrics(type, requests){
  let latency = {},
    download = {},
    ratio = {};

  let requestWindow = requests.slice(-20).filter(function (req) {
    return req.responsecode >= 200 && req.responsecode < 300 && req.type === "MediaSegment" && req._stream === type && !!req._mediaduration;
  }).slice(-4);

  if (requestWindow.length > 0) {
    let latencyTimes = requestWindow.map(function (req) {
      return Math.abs(req.tresponse.getTime() - req.trequest.getTime()) / 1000;
    });

    latency[type] = {
      average: latencyTimes.reduce(function (l, r) {
        return l + r;
      }) / latencyTimes.length,
      high: latencyTimes.reduce(function (l, r) {
        return l < r ? r : l;
      }),
      low: latencyTimes.reduce(function (l, r) {
        return l < r ? l : r;
      }),
      count: latencyTimes.length
    };

    let downloadTimes = requestWindow.map(function (req) {
      return Math.abs(req._tfinish.getTime() - req.tresponse.getTime()) / 1000;
    });

    download[type] = {
      average: downloadTimes.reduce(function (l, r) {
        return l + r;
      }) / downloadTimes.length,
      high: downloadTimes.reduce(function (l, r) {
        return l < r ? r : l;
      }),
      low: downloadTimes.reduce(function (l, r) {
        return l < r ? l : r;
      }),
      count: downloadTimes.length
    };

    let durationTimes = requestWindow.map(function (req) {
      return req._mediaduration;
    });

    ratio[type] = {
      average: (durationTimes.reduce(function (l, r) {
        return l + r;
      }) / downloadTimes.length) / download[type].average,
      high: durationTimes.reduce(function (l, r) {
        return l < r ? r : l;
      }) / download[type].low,
      low: durationTimes.reduce(function (l, r) {
        return l < r ? l : r;
      }) / download[type].high,
      count: durationTimes.length
    };

    return {
      latency: latency,
      download: download,
      ratio: ratio
    };
  }
  return null;
}
