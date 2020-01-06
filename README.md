![Eluvio Logo](src/static/images/Logo-Small.png "Eluvio Logo")
  
# Eluvio Video Streaming Sample

This small application is designed to demonstrate the video serving capabilities of the Eluvio Content Fabric. 

Feel free to look at the code to learn how to serve video from the Fabric in your own application, or keep reading for a detailed explanation of the [basic example page](examples/basic-video-example.html)

## Quick Start - Serving video from the Eluvio Content Fabric

Playing video from the Fabric using the Dash and HLS adaptive bitrate streaming protocols can be done in a few simple steps:

- Import the [Eluvio JavaScript client (ElvClient)](https://github.com/eluv-io/elv-client-js) and initialize ElvClient with the appropriate configuration URL and user private key (generating one if necessary)
- Use the client to retrieve the dash manifest / HLS playlist for the content - along with any DRM specific information
- Initialize your player with the manifest/playlist + DRM info and start playing


### Basic Example - Step by Step

The basic process for playing video can be seen in this [example page](examples/basic-video-example.html). This example is a standalone HTML page that will go through the above steps and play video content from the Fabric with Dash + Widevine if supported, and HLS + AES-128 encryption otherwise. 

Below is a detailed explanation of how this example page is set up.

In this example, we are using [dash.js](https://github.com/Dash-Industry-Forum/dash.js) and [hls.js](https://github.com/video-dev/hls.js) players, but any other Dash or HLS capable players should work.

*Note: Much of this code lies within async functions and uses the `await` syntax. The same can be achieved with the `Promise.then()` syntax.*

#### Step 1 - Initialize the client

```javascript
<script src="https://cdn.jsdelivr.net/npm/@eluvio/elv-client-js@latest/dist/ElvClient-min.js"></script>
```

Here we are importing the minified Eluvio JavaScript client from GitHub using jsDelivr. The client is also available on [NPM](https://www.npmjs.com/package/@eluvio/elv-client-js). For more information, check the [client documentation](https://github.com/eluv-io/elv-client-js).

```javascript
const configUrl = "https://demo.net955210.contentfabric.io/config";
const client = await ElvClient.FromConfigurationUrl({configUrl});

const wallet = client.GenerateWallet();
const mnemonic = wallet.GenerateMnemonic();
const signer = wallet.AddAccountFromMnemonic({mnemonic});

client.SetSigner({signer});
```

This is the process of intitializing the client. 

Being built on blockchain technology, interaction with the fabric requires the use of an ethereum private key, representing a user account, in order to verify and authenticate requests, perform encryption, transfer funds, and generally serve as an identity for the user. 

However, in many cases where the goal is simply to serve video, much of this functionality is unnecessary for an end user. Instead, we can simply generate a private key as needed in order to perform the functions necessary to access the fabric without the hassle of managing user data. In this case, we generate a random mnemonic phrase, which is then converted into a "signer" containing - among other things - a private key that the client may use to perform operations on the Fabric.

On the other hand, if a stronger user identity is desired, you can design your application to keep track of this mnemonic (or the private key it represents) and use it any time that user accesses a video or any other content on the Fabric. Because accessing content creates a blockchain record, it is then possible to see exactly which content was accessed by which user. 

Note that the more the account is used for, the more valuable the account becomes. Always treat private keys (and mnemonics) as private, sensitive user data. Always store and transfer them encrypted (the client has a method for encrypting private keys with a password - see see [ElvWallet#GenerateEncryptedPrivateKey](https://eluv-io.github.io/elv-client-js/ElvWallet.html#GenerateEncryptedPrivateKey)). A plaintext private key or mnemonic should *never* leave the user's browser - all use of the private key is done on the client.


#### Step 2 - Access the content

```javascript
const availableDRMs = await client.AvailableDRMs();

// Play the latest version of the content
const objectId = "iq__3MRbyPWE1EwEnPb2uNgVPHgF57Qj";

const playoutOptions = await client.PlayoutOptions({
  objectId,
  protocols: ["dash", "hls"],
  drms: availableDRMs 
});

// Play a specific version of the content
const versionHash = "hq__B1WL1oJa9MCiRpWXBmaoHtAwQdgNGKU36vazGDjjg9e8xS7uQADLct8j5NByXG3qnNAVQ7DcTh";

const playoutOptions = await client.PlayoutOptions({
  versionHash,
  protocols: ["dash", "hls"],
  drms: availableDRMs 
});

// Access content via link
const playoutOptions = await client.PlayoutOptions({
  versionHash,
  linkPath: "asset_metadata/titles/my-movie/trailers/default",
  protocols: ["dash", "hls"],
  drms: availableDRMs 
});
```

Now that the client is set up, we can use it to query the Fabric for information on how to play out content. Our content is represented by either an object ID (referring to content) or a version hash (referring to a specific version of content). For more information about how content on the Fabric is identified, see the [client documentation](https://github.com/eluv-io/elv-client-js).

Additionally, if the playout is specified in a metadata link in the content, the path to that link can be specified using the `linkPath` parameter. 

In this method, we specify which protocols we may want to play (Dash and HLS) as well as what DRM we support, and the fabric will respond with all the information we need to play the content in those configurations, depending on what the configuration the content itself supports. 

DRM support is determined by the client in the `AvailableDRMs` method with the following logic:

```javascript
const AvailableDRMs = async () => {
  const availableDRMs = ["aes-128"];

  if(typeof window.navigator.requestMediaKeySystemAccess !== "function") {
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
    console.log("No Widevine support detected");
  }

  return availableDRMs;
};
```

This code simply uses the [Navigator.requestMediaKeySystemAccess API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/requestMediaKeySystemAccess) to see if Widevine support is available. 

Widevine is generally supported in Firefox and Chromium-based browsers. With hls.js, HLS with AES-128 encryption is supported by all major browsers, so there is no need to check for any support. 

Here is an example response from the `PlayoutOptions` method - requesting both HLS and Dash, and supporting both AES-128 and Widevine:

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

This particular content has both clear and protected options for both HLS and dash. As you can see, each protocol has a playout URL corresponding to the manifest/playlist, which includes an authorization token that allows the user to access it, as well as information about the DRM required to play the content.

Note that support for protocols and DRM schemes can vary between content. It's a good idea for your application to be able to play multiple formats with and without DRM.

#### Step 3 - Play the content

Now that we have all the information we need to play the content, we can set up our player.

```javascript
const video = document.getElementById("video");

if(playoutOptions.hls) {
  PlayHLS(video, playoutOptions);
} else {
  const authToken = await client.GenerateStateChannelToken({objectId});
  PlayDash(authToken, video, playoutOptions);
}
```

In this case, we're prioritizing HLS if it's available, otherwise we'll play Dash. When playing Dash with Widevine, the Widevine requests will require an authorization token when querying the Fabric. This is the same token that is appended to our playout URL, but this code get it explicitly from the client instead of parsing it off of the URL. At this point, the client has cached this token, so it will be the same as the previous one and will not require any additional requests.

 ##### Playing HLS
 
 ```javascript
const PlayHLS = (video, playoutOptions) => {
  const playoutUrl = !playoutOptions.hls.playoutMethods["aes-128"] ?
    playoutOptions.hls.playoutMethods["aes-128"].playoutUrl :
    playoutOptions.hls.playoutMethods.clear.playoutUrl;
  
  const player = new Hls();

  player.loadSource(playoutUrl);
  player.attachMedia(video);

  // Autoplay
  player.on(Hls.Events.MANIFEST_PARSED, () => {
    video.play();
  });
};
```

##### Playing Dash

```javascript
const PlayDash = (authToken, video, playoutOptions) => {
  const player = dashjs.MediaPlayer().create();
  
  const playoutUrl = playoutOptions.dash.playoutMethods.widevine ?
    playoutOptions.dash.playoutMethods.widevine.playoutUrl :
    playoutOptions.dash.playoutMethods.clear.playoutUrl;
  
  if(playoutOptions.dash.playoutMethods.widevine) {
    const widevineUrl = playoutOptions.dash.playoutMethods.widevine.drms.widevine.licenseServers
      .find(server => server.startsWith("https"));
  
    player.setProtectionData({
      "com.widevine.alpha": {
        "serverURL": widevineUrl,
        "httpRequestHeaders": {
          "Authorization": `Bearer ${authToken}`
        },
        "withCredentials": false
      }
    });
  }
 
  player.initialize(video, playoutUrl, true);
};
```

Both cases are straightforward - determine the playout url, then set up the corresponding player.

With dash, a bit of extra work must be done to set up Widevine:
- Determine the widevine server url, which is specified in `drms.widevine.licenseServers`. In this case, we are explicitly preferring HTTPS urls, in case any of the server urls are HTTP.
- Set the Fabric authorization token we retrieved previously in the Widevine request headers. This will ensure that the HTTP requests to the Fabric are properly authenticated. We also explicitly specify withCredentials=false to avoid CORS issues for these requests.


Note: Both of these examples intend for the video to autoplay, but many modern browsers block autoplay by default without user interaction.

#### Step 4 - Watch

At this point, you should have fast, high quality video in your player, freshly transcoded from the Fabric.


