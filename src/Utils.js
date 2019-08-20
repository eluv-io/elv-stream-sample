import {ElvClient} from "elv-client-js";

export const InitializeClient = async (configUrl) => {
  if(!configUrl) {
    configUrl = "https://main.net955304.contentfabric.io/config";
  }

  const client = await ElvClient.FromConfigurationUrl({configUrl});

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

export const LoadVideo = async ({client, versionHash, protocol}) => {
  try {
    const { objectId } = client.utils.DecodeVersionHash(versionHash);

    const metadata = await client.ContentObjectMetadata({versionHash});

    const playoutOptions = await client.PlayoutOptions({
      versionHash,
      protocols: [protocol],
      drms: await AvailableDRMs()
    });

    const availableDRMs = Object.keys(playoutOptions[protocol].drms);

    const posterUrl = await client.Rep({
      versionHash,
      rep: "player_background",
      channelAuth: true
    });

    const authToken = await client.GenerateStateChannelToken({objectId});

    return {
      metadata,
      playoutOptions,
      availableDRMs,
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
