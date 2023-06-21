# Eluvio Video Streaming Sample

This small application is designed to demonstrate the video serving capabilities of the Eluvio Content Fabric. 

Feel free to look at the code to learn how to serve video from the Fabric in your own application, or keep reading for a detailed explanation of the [basic example page](examples/basic-video-example.html)

## Using the Eluvio Player
It is highly recommended to use the [Eluvio Player](https://www.npmjs.com/package/@eluvio/elv-player-js) instead of implementing playout yourself. The Eluvio Player makes it easy to play content from the fabric on your web page.

## Quick Start - Serving video from the Eluvio Content Fabric

Playing video from the Fabric using the Dash and HLS adaptive bitrate streaming protocols can be done in a few simple steps:

- Import the [Eluvio JavaScript client (ElvClient)](https://www.npmjs.com/package/@eluvio/elv-client-js) and initialize ElvClient with the appropriate configuration URL and (for non-public content) user private key
- Use the client to retrieve the dash manifest / HLS playlist for the content, along with any DRM specific information
- Initialize the player with the manifest/playlist + DRM info and start playing

#### Using the Eluvio Wallet Client

If you are using the wallet environment, you can retrieve the ElvClient instance from the wallet client:
- Initialze the [Eluvio Wallet Client](https://eluv-io.github.io/elv-client-js/wallet-client/index.html) and perform any necessary authorization (e.g. logging in with `walletClient.LogIn`)
- Access the wallet client's instance of ElvClient via `walletClient.client`. For example, `walletClient.client.PlayoutOptions(...)`

### Basic Example - Step by Step

The basic process for playing video can be seen in this [example page](examples/basic-video-example.html). This example is a standalone HTML page that will go through the above steps and play video content from the Fabric. It allows playout of both Dash and HLS, either in the clear or with Widevine, AES-128, Sample AES or FairPlay protection, respectively, and includes three different players: [dash.js](https://github.com/Dash-Industry-Forum/dash.js), [hls.js](https://github.com/video-dev/hls.js), and [Bitmovin](https://bitmovin.com/video-player) - though any Dash and/or HLS capable players should work similarly.

Below is a detailed explanation of how this example page works.

#### Important Note: 

FairPlay support and the Bitmovin player will not run from a static HTML file. In order to run this sample with support for Bitmovin and FairPlay, it must be accessed from a web server. You can use the node [http-server](https://www.npmjs.com/package/http-server) utility to serve the file locally:

- Install http-server using `npm install -g http-server`
- Use http-server to serve the examples directory `http-server ./examples`
- Open `http://localhost:8080/basic-video-example.html` in your browser

### Video Playout Example Page

When you open the example page (`examples/basic-video-example.html`) in your browser, you'll see a form that allows you to select a player and a protocol/drm combination for playing video, as well as a configuration URL for the client, and a ID or version hash for content on the Fabric. When you enter a valid ID and press the "Load" button, the page will initialize the Eluvio JavaScript client, load the playout options for the content, set up the video player to play the content.

#### Step 1 - Initialize the client

Starting at the top of the file, we are importing the various players, as well as the Eluvio JavaScript client (elv-client-js).

```javascript
<script type="text/javascript" src="https://cdn.jsdelivr.net/gh/eluv-io/elv-client-js/dist/ElvClient-min.js"></script>
```

This line imports the minified Eluvio JavaScript client from [GitHub](https://github.com/eluv-io/elv-client-js) using the [jsDelivr](https://www.jsdelivr.com) CDN. The client is also available on [NPM](https://www.npmjs.com/package/@eluvio/elv-client-js). For more information, check the [client documentation](https://eluv-io.github.io/elv-client-js/ElvClient.html).

The client can also be installed via the NPM package [@eluvio/elv-client-js](https://www.npmjs.com/package/@eluvio/elv-client-js).

Moving down to the `Load` method (~line 400):

```javascript
// Create client with the configuration URL of the network
const client = await ElvClient.FromConfigurationUrl({
  configUrl: "https://main.net955305.contentfabric.io/config"
});

// Initialize client with private key
const wallet = client.GenerateWallet();
const signer = wallet.AddAccount({privateKey: (private-key)});
await client.SetSigner({signer});

```

This is the basic process of intitializing the client. 

Being built on blockchain technology, interaction with the Fabric requires the use of an ethereum private key, representing a user account, in order to verify and authenticate requests, perform encryption, transfer funds, and generally serve as an identity for the user. 

However, in many cases where the goal is simply to serve video, much of this functionality is unnecessary for an end user. Instead, we can simply generate a private key as needed in order to perform the functions necessary to access the Fabric without the hassle of managing user data. In this case, we generate a random mnemonic phrase, which is then converted into a "signer" containing - among other things - a private key that the client may use to perform operations on the Fabric. The client does this automatically by default - if no other authorization method is set up, it will use a randomly generated private key.

On the other hand, if a stronger user identity is desired, you can design your application to keep track of this mnemonic (or the private key it represents) and use it any time that user accesses a video or any other content on the Fabric. Because accessing content creates a blockchain record, it is then possible to correlate every content access to the specific user who accessed it.

Note that the more the account is used for, the more valuable the account becomes. Always treat private keys (and mnemonics) as private, sensitive user data. Always store and transfer them encrypted (the client has a method for encrypting private keys with a password - see see [ElvWallet#GenerateEncryptedPrivateKey](https://eluv-io.github.io/elv-client-js/ElvWallet.html#GenerateEncryptedPrivateKey)). A plaintext private key or mnemonic should *never* leave the user's browser - all use of the private key should done on the client side.

For end user cases where the user's account is important, it is recommended to use the [Eluvio Wallet Client](https://eluv-io.github.io/elv-client-js/wallet-client/index.html). This allows the user to log in via OAuth with email and password, creating a custodial wallet where the private key is protected.

#### Step 2 - Access the content

Now that the client is set up, we can use it to query the Fabric for information on how to play out content. Our content is represented by either an object ID (referring to content) or a version hash (referring to a specific version of content). The page checks the prefix of the specified ID to determine which type it is. For more information about how content on the Fabric is identified, see the [client documentation](https://github.com/eluv-io/elv-client-js).

The rest of the load method uses the now initialized client to retrieve playout options to play the content via the selected protocol and DRM combination, then passes that information to the appropriate method to set up the selected player.

```javascript
const contentId = document.getElementById("content-id").value;
const objectId = contentId.startsWith("iq__") ? contentId : "";
const versionHash = contentId.startsWith("hq__") ? contentId : "";

let playoutOptions;
if(PLAYER_TYPE === "bitmovin") {
  playoutOptions = await client.BitmovinPlayoutOptions({
    objectId,
    versionHash,
    protocols: [PROTOCOL],
    drms: [DRM]
  });

  LoadBitmovin(playoutOptions);
} else {
  playoutOptions = await client.PlayoutOptions({
    objectId,
    versionHash,
    protocols: [PROTOCOL],
    drms: [DRM]
  });

  if(PROTOCOL === "hls") {
    LoadHlsJs(playoutOptions);
  } else {
    LoadDash(playoutOptions);
  }
}
```

If the playout is specified in a metadata link in the content, the path to that link can be specified using the `linkPath` parameter. 

```javascript
await client.PlayoutOptions({
  objectId,
  versionHash,
  protocols: [PROTOCOL],
  drms: [DRM],
  linkPath: "public/asset_metadata/titles/0/sources/default"
});
```

In the `PlayoutOptions` method, we specify which protocols we may want to play (Dash and HLS) as well as what DRM we support, and the Fabric will respond with all the information we need to play the content in those configurations, depending on what the configuration the content itself supports. 

The `BitmovinPlayoutOptions` method is a convenience for setting up playout with the Bitmovin player. This method produces playout options in a format that can be passed directly to the `load` method of the Bitmovin SDK.

The normal `PlayoutOptions` method can be used instead if you want to explicitly craft your Bitmovin options.

##### DRM

DRM support can be determined by the client using the `AvailableDRMs` method:

```javascript
const availableDRMs = await client.AvailableDRMs();
> ["clear", "aes-128"], ["clear", "aes-128", "widevine"], ["clear", "sample-aes", "fairplay"]
```

This code uses the [Navigator.requestMediaKeySystemAccess API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMediaKeySystemAccess) to see if Widevine support is available. 

Widevine is generally supported in Firefox and Chromium-based browsers. HLS with AES-128 encryption is supported by most browsers, with the exception of newer Safari browsers and on iOS devices - for those, sample AES (and potentially FairPlay) is supported instead. Use the AvailableDRMs method to determine whether to use AES-128 or Sample AES for encrypted AES playout.

##### Offerings

By default, PlayoutOptions retrieves the default offering, but some content may have multiple offerings. To determine the offerings available in the content, you can use the AvailableOfferings method in the client:

```javascript
const availableOfferings = await client.AvailableOfferings({objectId});

{
  "default": {
    "display_name": "default"
  },
  "special_offering": {
    "display_name": "Special Offering"
  }
}
```

To retrieve available offerings via a link, you can specify the `linkPath` parameter in the same way you would specify it in `PlayoutOptions`:

```javascript
const availableOfferings = await client.AvailableOfferings({
  objectId,
  linkPath: "public/asset_metadata/titles/0/sources/default"
});

{
  "default": {
    "display_name": "default"
  }
}
```

To retrieve options for a non-default offering, simply specify it in the offering parameter of PlayoutOptions:

```javascript
await client.PlayoutOptions({
  objectId,
  versionHash,
  offering: "special_offering",
  protocols: [PROTOCOL],
  drms: [DRM]
});
```

##### Example Playout Options

Here is an example response from the `PlayoutOptions` method - requesting both HLS and Dash, and supporting clear playout as well as AES-128 and Widevine:

```json
{
  "dash": {
    "playoutMethods": {
      "clear": {
        "playoutUrl": "https://host-38-142-50-109.test.contentfabric.io/qlibs/ilibNcWqQbLKvF82XP29hPqWG45U4Ek/q/hq__2eMmqtaBp79RZPvtC6u7o1bB9aVzLtJcPfm68BakXHHoemEQnbB4V5LwgyPi33KNZ4NXFaSgH1/rep/playout/default/dash-clear/dash.mpd?authorization=eyJxc3BhY2VfaWQiOiJpc3BjNFE3UmNNS0tLbkpITmk1Z2Q2WGJWV2ZVQXI0ciIsInFsaWJfaWQiOiJpbGliTmNXcVFiTEt2RjgyWFAyOWhQcVdHNDVVNEVrIiwiYWRkciI6IjB4ZkUyREFlQTU0NjQyODYwMzM3M0M1NTBmOEM2Rjg1M2NENDczOGE4NiIsInFpZCI6ImlxX19qaFFGMXkyYWp4MkI1eDd0REt4aDVUN3pqRnkiLCJncmFudCI6InJlYWQiLCJ0eF9yZXF1aXJlZCI6ZmFsc2UsImlhdCI6MTU3ODMzOTc2MSwiZXhwIjoxNTc4NDI2MTYxLCJhdXRoX3NpZyI6IkVTMjU2S19HQTJnbVRqbjZXN3ExQkdiWHF3TnNxSmhyWTdSYUMyb215OU1KMWhoMTZ6RVJ3ZTN0THNoV21laTF5VG1hbVJhMnpSTVBZY3BBZ2VvWlcxR21pcndpR0tpIiwiYWZnaF9wayI6IiJ9.RVMyNTZLXzdSQjhFcTJXZWVoa3JqcHpScEZudUhiNFdMQm8zTXQ3RlBHampZV2ZIQ0w0V2JLN2gyUmZjUVFzUmV6TUdWbXY5aVFzZGdOQURNSzE1SzFmODlrMmZqN2t2"
      },
      "widevine": {
        "playoutUrl": "https://host-38-142-50-109.test.contentfabric.io/qlibs/ilibNcWqQbLKvF82XP29hPqWG45U4Ek/q/hq__2eMmqtaBp79RZPvtC6u7o1bB9aVzLtJcPfm68BakXHHoemEQnbB4V5LwgyPi33KNZ4NXFaSgH1/rep/playout/default/dash-widevine/dash.mpd?authorization=eyJxc3BhY2VfaWQiOiJpc3BjNFE3UmNNS0tLbkpITmk1Z2Q2WGJWV2ZVQXI0ciIsInFsaWJfaWQiOiJpbGliTmNXcVFiTEt2RjgyWFAyOWhQcVdHNDVVNEVrIiwiYWRkciI6IjB4ZkUyREFlQTU0NjQyODYwMzM3M0M1NTBmOEM2Rjg1M2NENDczOGE4NiIsInFpZCI6ImlxX19qaFFGMXkyYWp4MkI1eDd0REt4aDVUN3pqRnkiLCJncmFudCI6InJlYWQiLCJ0eF9yZXF1aXJlZCI6ZmFsc2UsImlhdCI6MTU3ODMzOTc2MSwiZXhwIjoxNTc4NDI2MTYxLCJhdXRoX3NpZyI6IkVTMjU2S19HQTJnbVRqbjZXN3ExQkdiWHF3TnNxSmhyWTdSYUMyb215OU1KMWhoMTZ6RVJ3ZTN0THNoV21laTF5VG1hbVJhMnpSTVBZY3BBZ2VvWlcxR21pcndpR0tpIiwiYWZnaF9wayI6IiJ9.RVMyNTZLXzdSQjhFcTJXZWVoa3JqcHpScEZudUhiNFdMQm8zTXQ3RlBHampZV2ZIQ0w0V2JLN2gyUmZjUVFzUmV6TUdWbXY5aVFzZGdOQURNSzE1SzFmODlrMmZqN2t2",
        "drms": {
          "widevine": {
            "licenseServers": [
              "https://host-35-237-243-135.test.contentfabric.io/wv/?qhash=hq__2eMmqtaBp79RZPvtC6u7o1bB9aVzLtJcPfm68BakXHHoemEQnbB4V5LwgyPi33KNZ4NXFaSgH1",
              "https://host-35-236-19-5.test.contentfabric.io/wv/?qhash=hq__2eMmqtaBp79RZPvtC6u7o1bB9aVzLtJcPfm68BakXHHoemEQnbB4V5LwgyPi33KNZ4NXFaSgH1",
              "https://host-35-226-231-183.test.contentfabric.io/wv/?qhash=hq__2eMmqtaBp79RZPvtC6u7o1bB9aVzLtJcPfm68BakXHHoemEQnbB4V5LwgyPi33KNZ4NXFaSgH1"
            ]
          }
        }
      }
    }
  },
  "hls": {
    "playoutMethods": {
      "sample-aes": {
        "playoutUrl": "https://host-38-142-50-109.test.contentfabric.io/qlibs/ilibNcWqQbLKvF82XP29hPqWG45U4Ek/q/hq__2eMmqtaBp79RZPvtC6u7o1bB9aVzLtJcPfm68BakXHHoemEQnbB4V5LwgyPi33KNZ4NXFaSgH1/rep/playout/default/hls-sample-aes/playlist.m3u8?player_profile=hls-js&authorization=eyJxc3BhY2VfaWQiOiJpc3BjNFE3UmNNS0tLbkpITmk1Z2Q2WGJWV2ZVQXI0ciIsInFsaWJfaWQiOiJpbGliTmNXcVFiTEt2RjgyWFAyOWhQcVdHNDVVNEVrIiwiYWRkciI6IjB4ZkUyREFlQTU0NjQyODYwMzM3M0M1NTBmOEM2Rjg1M2NENDczOGE4NiIsInFpZCI6ImlxX19qaFFGMXkyYWp4MkI1eDd0REt4aDVUN3pqRnkiLCJncmFudCI6InJlYWQiLCJ0eF9yZXF1aXJlZCI6ZmFsc2UsImlhdCI6MTU3ODMzOTc2MSwiZXhwIjoxNTc4NDI2MTYxLCJhdXRoX3NpZyI6IkVTMjU2S19HQTJnbVRqbjZXN3ExQkdiWHF3TnNxSmhyWTdSYUMyb215OU1KMWhoMTZ6RVJ3ZTN0THNoV21laTF5VG1hbVJhMnpSTVBZY3BBZ2VvWlcxR21pcndpR0tpIiwiYWZnaF9wayI6IiJ9.RVMyNTZLXzdSQjhFcTJXZWVoa3JqcHpScEZudUhiNFdMQm8zTXQ3RlBHampZV2ZIQ0w0V2JLN2gyUmZjUVFzUmV6TUdWbXY5aVFzZGdOQURNSzE1SzFmODlrMmZqN2t2",
        "drms": {
          "sample-aes": {}
        }
      },
      "aes-128": {
        "playoutUrl": "https://host-38-142-50-109.test.contentfabric.io/qlibs/ilibNcWqQbLKvF82XP29hPqWG45U4Ek/q/hq__2eMmqtaBp79RZPvtC6u7o1bB9aVzLtJcPfm68BakXHHoemEQnbB4V5LwgyPi33KNZ4NXFaSgH1/rep/playout/default/hls-aes/playlist.m3u8?player_profile=hls-js&authorization=eyJxc3BhY2VfaWQiOiJpc3BjNFE3UmNNS0tLbkpITmk1Z2Q2WGJWV2ZVQXI0ciIsInFsaWJfaWQiOiJpbGliTmNXcVFiTEt2RjgyWFAyOWhQcVdHNDVVNEVrIiwiYWRkciI6IjB4ZkUyREFlQTU0NjQyODYwMzM3M0M1NTBmOEM2Rjg1M2NENDczOGE4NiIsInFpZCI6ImlxX19qaFFGMXkyYWp4MkI1eDd0REt4aDVUN3pqRnkiLCJncmFudCI6InJlYWQiLCJ0eF9yZXF1aXJlZCI6ZmFsc2UsImlhdCI6MTU3ODMzOTc2MSwiZXhwIjoxNTc4NDI2MTYxLCJhdXRoX3NpZyI6IkVTMjU2S19HQTJnbVRqbjZXN3ExQkdiWHF3TnNxSmhyWTdSYUMyb215OU1KMWhoMTZ6RVJ3ZTN0THNoV21laTF5VG1hbVJhMnpSTVBZY3BBZ2VvWlcxR21pcndpR0tpIiwiYWZnaF9wayI6IiJ9.RVMyNTZLXzdSQjhFcTJXZWVoa3JqcHpScEZudUhiNFdMQm8zTXQ3RlBHampZV2ZIQ0w0V2JLN2gyUmZjUVFzUmV6TUdWbXY5aVFzZGdOQURNSzE1SzFmODlrMmZqN2t2",
        "drms": {
          "aes-128": {}
        }
      },
      "clear": {
        "playoutUrl": "https://host-38-142-50-109.test.contentfabric.io/qlibs/ilibNcWqQbLKvF82XP29hPqWG45U4Ek/q/hq__2eMmqtaBp79RZPvtC6u7o1bB9aVzLtJcPfm68BakXHHoemEQnbB4V5LwgyPi33KNZ4NXFaSgH1/rep/playout/default/hls-clear/playlist.m3u8?player_profile=hls-js&authorization=eyJxc3BhY2VfaWQiOiJpc3BjNFE3UmNNS0tLbkpITmk1Z2Q2WGJWV2ZVQXI0ciIsInFsaWJfaWQiOiJpbGliTmNXcVFiTEt2RjgyWFAyOWhQcVdHNDVVNEVrIiwiYWRkciI6IjB4ZkUyREFlQTU0NjQyODYwMzM3M0M1NTBmOEM2Rjg1M2NENDczOGE4NiIsInFpZCI6ImlxX19qaFFGMXkyYWp4MkI1eDd0REt4aDVUN3pqRnkiLCJncmFudCI6InJlYWQiLCJ0eF9yZXF1aXJlZCI6ZmFsc2UsImlhdCI6MTU3ODMzOTc2MSwiZXhwIjoxNTc4NDI2MTYxLCJhdXRoX3NpZyI6IkVTMjU2S19HQTJnbVRqbjZXN3ExQkdiWHF3TnNxSmhyWTdSYUMyb215OU1KMWhoMTZ6RVJ3ZTN0THNoV21laTF5VG1hbVJhMnpSTVBZY3BBZ2VvWlcxR21pcndpR0tpIiwiYWZnaF9wayI6IiJ9.RVMyNTZLXzdSQjhFcTJXZWVoa3JqcHpScEZudUhiNFdMQm8zTXQ3RlBHampZV2ZIQ0w0V2JLN2gyUmZjUVFzUmV6TUdWbXY5aVFzZGdOQURNSzE1SzFmODlrMmZqN2t2"
      }
    }
  }
}
```

This particular content has both clear and protected options for both HLS and Dash. As you can see, each protocol has a playout URL corresponding to the manifest/playlist, which includes an authorization token that allows the user to access it, as well as information about the DRM required to play the content.

Note that support for protocols and DRM schemes can vary between content. It may be good idea for your application to be able to play multiple formats with and without DRM if you're unsure about the exact specifications of your content.

#### Step 3 - Play the content

Now that we have all the information we need to play the content, we can set up the player.

##### Playing HLS
 
 ```javascript

const LoadHlsJs = (playoutOptions) => {
  const playoutMethods = playoutOptions.hls.playoutMethods;

  let playoutInfo;
  if(DRM === "aes-128") {
    playoutInfo = playoutMethods["aes-128"];
  } else if(DRM === "sample-aes") {
    playoutInfo = playoutMethods["sample-aes"];
  } else {
    playoutInfo = playoutMethods.clear;
  }

  if(!playoutInfo) {
    SetErrorMessage(`HLS ${DRM} playout not supported for this content`);
    return;
  }

  const playerElement = CreatePlayerElement();

  // Use native player for Sample AES and FairPlay
  if(DRM === "sample-aes" && PLAYER_TYPE !== "bitmovin") {
    playerElement.src = playoutInfo.playoutUrl;
    return;
  } else if(DRM === "fairplay" && PLAYER_TYPE !== "bitmovin") {
    import("./FairPlay.js")
      .then(async ({InitializeFairPlayStream}) => {
        try {
          await InitializeFairPlayStream({playoutOptions, video: playerElement})
        } catch(error) {
          SetErrorMessage(error.toString());
        }
      });
    return;
  }

  // Move authorization token from URL params to authorization header.
  // This improves caching of video segments.
  const playoutUrl = new URL(playoutInfo.playoutUrl);
  const authorization = playoutUrl.searchParams.get("authorization");
  playoutUrl.searchParams.delete("authorization");

  const playerConfiguration = {
    ...PlayerConfiguration(),
    xhrSetup: xhr => {
      xhr.setRequestHeader("Authorization", `Bearer ${authorization}`);

      return xhr;
    }
  }

  // Load content and apply specified settings
  player = new Hls(playerConfiguration);
  player.loadSource(playoutUrl.toString());
  player.attachMedia(playerElement);


  // Register listener to retrieve bitrate for display
  player.on(Hls.Events.LEVEL_SWITCHED, () => {
    const currentLevel = player.levels[player.currentLevel];

    document.getElementById("bitrate").innerHTML = `${currentLevel.attrs.RESOLUTION} | ${currentLevel.bitrate / 1000 / 1000} Mbps`;
  });
};
```

##### Playing Dash

```javascript
const LoadDash = (playoutOptions) => {
  const playoutMethods = playoutOptions.dash.playoutMethods;

  // Determine playout URL and license server
  let playoutInfo, licenseServer;
  if(DRM === "widevine") {
    playoutInfo = playoutMethods.widevine;

    if(playoutInfo) {
      licenseServer = playoutMethods.widevine.drms.widevine.licenseServers[0];
    }
  } else {
    // Play clear
    playoutInfo = playoutMethods.clear;
  }

  if(!playoutInfo) {
    SetErrorMessage(`Dash ${DRM} playout not supported for this content`);
    return;
  }

  // Initialize dash player
  const playerElement = CreatePlayerElement();
  player = dashjs.MediaPlayer().create();


  // Move authorization token from URL params to authorization header.
  // This improves caching of video segments.
  const playoutUrl = new URL(playoutInfo.playoutUrl);
  const authorization = playoutUrl.searchParams.get("authorization");
  playoutUrl.searchParams.delete("authorization");

  player.extend("RequestModifier", function () {
    return {
      modifyRequestHeader: xhr => {
        xhr.setRequestHeader("Authorization", `Bearer ${authorization}`);

        return xhr;
      },
      modifyRequestURL: url => url
    };
  });

  // Specify widevine license server
  if(DRM === "widevine") {
    player.setProtectionData({
      "com.widevine.alpha": {
        "serverURL": licenseServer
      }
    });
  }

  // Load content and apply specified settings
  player.initialize(playerElement, playoutUrl.toString());
  player.updateSettings(PlayerConfiguration());


  // Register listener to retrieve bitrate for display
  player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, () => {
    const currentLevel = player.getBitrateInfoListFor("video")[player.getQualityFor("video")];

    document.getElementById("bitrate").innerHTML = `${currentLevel.width}x${currentLevel.height} | ${currentLevel.bitrate / 1000 / 1000} Mbps`;
  });
};
```

Both cases are relatively straightforward - determine the playout url, then set up the corresponding player. Note that HLS.js does not support HLS playout with Sample AES encryption. You can instead use native Apple HLS playback instead by setting the `src` attribute of the video element.

##### Authorization

In both cases, the authorization token is removed from the playout URL and instead added to the `Authorization` request header. This is not necessary, but it is recommended to improve caching performance for your content. If the authorization token is in the playout URL, each segment URL requested by the player will include it as well. Each client will have a different authorization token which means every request URL will be unique, and therefore will not be improved by caching.

##### Widevine

To set up Widevine in the Dash case, an additional step must be done to indicate the license server to use. With dashjs, this is done using the `setProtectionData` method. The list of valid license servers is specified in `drms.widevine.licenseServers` of the Dash/Widevine playout methods.

##### FairPlay

Setting up a stream with FairPlay support is a bit more involved than other methods, but we have included a module to make it easy. Simply import `InitializeFairPlayStream` from `FairPlay.js` at the root of this repository, and pass your playout options and the HTML video element for the stream, and it will take care of the rest.

```javascript
  import {InitializeFairPlayStream} from "./FairPlay";

  const video = document.getElementById("video");
  const playoutOptions = await client.BitmovinPlayoutOptions({
    objectId,
    versionHash,
    protocols: ["hls"],
    drms: ["fairplay"]
  });

  InitializeFairPlayStream({playoutOptions, video});
```    

##### Bitmovin

```javascript
const LoadBitmovin = (playoutOptions) => {
  const playerElement = CreatePlayerElement();

  const config = {
    key: "<bitmovin-key>",
    playback: {
      autoplay: true
    }
  };

  // API 8
  const player = new bitmovin.player.Player(playerElement, config);

  player.load(playoutOptions).then(
    () => {
      console.log('Successfully created Bitmovin Player instance');
    },
    (error) => {
      DestroyPlayer();
      if(error.name === "SOURCE_NO_SUPPORTED_TECHNOLOGY") {
        SetErrorMessage(`${PROTOCOL} ${DRM} playout not supported for this content`);
      } else {
        SetErrorMessage(`Bitmovin error: ${error.name}`);
        console.error(error);
      }
    }
  );
};
```

Setting up Bitmovin is simpler than setting up HLS or Dash playout separately, because the client automatically sets up the configuration based on the specified protocol and drm options. This includes indicating the Widevine license server, which has to be done explicitly in the dashjs example.

#### Step 4 - Watch

At this point, you should have fast, high quality video in your player, freshly transcoded from the Fabric.


#### Addendum: Using Global URLs

If for some reason you are not able to use ElvClient or the Eluvio Player in your project (for example, native mobile applications), you can use the fabric's global URLs feature to refer to content in the fabric. These URLs will resolve to a fabric node based on the user's location, ensuring that the content is served from close by for best performance.

The format of these urls is 
```
https://<space>.<network>.contentfabric.io/s/<space>/<content>
``` 
for public content, or 
```
https://<space>.<network>.contentfabric.io/s/<space>/t/<auth-token>/<content>
``` 
for authorized content. 

For the production network, the space is `main` and the network is `net955305` - `https://main.net955305.contentfabric.io/s/main/`. 

For demo, the space is `demov3` and the network is `net955210` - `https://demov3.net955210.contentfabric.io/s/demov3/`

Content is referred to either by version hash (`/q/hq__...`) or library ID and object ID (`/qlibs/ilib.../q/iq__...`).

### Examples:

``` 
Public metadata:

https://main.net955305.contentfabric.io/s/main/q/hq__37GwEoqi3NeaMw6FhtjsUM4hJMvM1a6BhPsL9SDybyawa31hHGDKcZrCjdsdiZdXec9uzLByxj/meta/public

https://main.net955305.contentfabric.io/s/main/q/hq__37GwEoqi3NeaMw6FhtjsUM4hJMvM1a6BhPsL9SDybyawa31hHGDKcZrCjdsdiZdXec9uzLByxj/meta/public/name

```

```
Playout URLs for HLS Clear:

By version hash:

https://main.net955305.contentfabric.io/s/main/q/hq__37GwEoqi3NeaMw6FhtjsUM4hJMvM1a6BhPsL9SDybyawa31hHGDKcZrCjdsdiZdXec9uzLByxj/rep/playout/default/hls-clear/playlist.m3u8

By library ID and Object ID:

https://main.net955305.contentfabric.io/s/main/qlibs/ilib3C82jGbT41QLSZb35dDwmUWbSuP9/q/iq__5E9asweGiUmnJyPjrwGw7ur3ssd/rep/playout/default/hls-clear/playlist.m3u8
```
