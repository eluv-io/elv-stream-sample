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
    "playoutUrl": "https://host-66-220-3-82.contentfabric.io/q/hq__BD1BouHkFraAcDjvoyHoiKpVhf4dXzNsDT5USe8mrZ7YDhLPDoZGnoU32iZvDYiQW8vVi6X7rV/rep/playout/default/dash-widevine/dash.mpd?authorization=eyJxc3BhY2VfaWQiOiJpc3BjQXBvV1BRUnJUa1JRVjFLcFlqdnFQeVNBbXhhIiwicWxpYl9pZCI6ImlsaWJxTUdXTVNodUZjcTlLdU1pTHJaa1FNakFLanUiLCJhZGRyIjoiMHg5NmEwMTA0QkE0MzRCMzA2NTFBOTE2NTY4NTg5MDBCZGRDNTcwMzY0IiwicWlkIjoiaXFfXzJ2RGJteFRkYWl2UG5tRG44UktMYnhTSFVNZmoiLCJncmFudCI6InJlYWQiLCJ0eF9yZXF1aXJlZCI6ZmFsc2UsImlhdCI6MTU2NjQxNzMwMywiZXhwIjoxNTY2NTAzNzAzLCJhdXRoX3NpZyI6IkVTMjU2S19BRjNYMmRRQTFCb3JYUGRpbW5UcDhYdkQxSlJDUmdMZnU2Q2s1MTlMY05abllVYXRVallLS1BMRjc2TUsyRXliczZVWWtXaVFKanU4RVZBYVlYWURMcWhWUiIsImFmZ2hfcGsiOiIifQ%3D%3D.RVMyNTZLXzI2dDVvUkpIRlpaZjN3QWJndHk3bzVFR3lzV1A0cHk1ZWpHaXdkOURyOWNxNVJITmNSZEZwd1o1a2NlWjhaS2l4dVJhQW9meEdIU3VFeEFuUnJpU1h6b0J5",
    "drms": {
      "widevine": {
        "licenseServers": [
          "https://host-66-220-3-82.contentfabric.io/wv/?qhash=hq__BD1BouHkFraAcDjvoyHoiKpVhf4dXzNsDT5USe8mrZ7YDhLPDoZGnoU32iZvDYiQW8vVi6X7rV",
          "http://66.220.3.82:8545/wv/?qhash=hq__BD1BouHkFraAcDjvoyHoiKpVhf4dXzNsDT5USe8mrZ7YDhLPDoZGnoU32iZvDYiQW8vVi6X7rV"
        ]
      }
    }
  },
  "hls": {
    "playoutUrl": "https://host-66-220-3-82.contentfabric.io/q/hq__BD1BouHkFraAcDjvoyHoiKpVhf4dXzNsDT5USe8mrZ7YDhLPDoZGnoU32iZvDYiQW8vVi6X7rV/rep/playout/default/hls-aes/playlist.m3u8?authorization=eyJxc3BhY2VfaWQiOiJpc3BjQXBvV1BRUnJUa1JRVjFLcFlqdnFQeVNBbXhhIiwicWxpYl9pZCI6ImlsaWJxTUdXTVNodUZjcTlLdU1pTHJaa1FNakFLanUiLCJhZGRyIjoiMHg5NmEwMTA0QkE0MzRCMzA2NTFBOTE2NTY4NTg5MDBCZGRDNTcwMzY0IiwicWlkIjoiaXFfXzJ2RGJteFRkYWl2UG5tRG44UktMYnhTSFVNZmoiLCJncmFudCI6InJlYWQiLCJ0eF9yZXF1aXJlZCI6ZmFsc2UsImlhdCI6MTU2NjQxNzMwMywiZXhwIjoxNTY2NTAzNzAzLCJhdXRoX3NpZyI6IkVTMjU2S19BRjNYMmRRQTFCb3JYUGRpbW5UcDhYdkQxSlJDUmdMZnU2Q2s1MTlMY05abllVYXRVallLS1BMRjc2TUsyRXliczZVWWtXaVFKanU4RVZBYVlYWURMcWhWUiIsImFmZ2hfcGsiOiIifQ%3D%3D.RVMyNTZLXzI2dDVvUkpIRlpaZjN3QWJndHk3bzVFR3lzV1A0cHk1ZWpHaXdkOURyOWNxNVJITmNSZEZwd1o1a2NlWjhaS2l4dVJhQW9meEdIU3VFeEFuUnJpU1h6b0J5",
    "drms": {
      "aes-128": {}
    }
  }
}
```

This particular content has both clear and protected options for both HLS and dash. As you can see, each protocol has a playout URL corresponding to the manifest/playlist, which includes an authorization token that allows the user to access it, as well as information about the DRM required to play the content.

Note that support for protocols and DRM schemes can vary between content. It's a good idea for your application to be able to play multiple formats with and without DRM.

**NOTE**: If any DRM options are specified, clear playout options will *not* be returned. If you want to play content without DRM, you must exclude the `drms` argument from the `PlayoutOptions` method; 



#### Step 3 - Play the content

Now that we have all the information we need to play the content, we can set up our player.

```javascript
const video = document.getElementById("video");

if(playoutOptions.dash) {
  const authToken = await client.GenerateStateChannelToken({versionHash});
  PlayDash(authToken, video, playoutOptions);
} else {
  PlayHLS(video, playoutOptions);
}
```

In this case, we're prioritizing Dash if it's available, otherwise we'll play HLS. When playing Dash with Widevine, the Widevine requests will require an authorization token when querying the Fabric. This is the same token that is appended to our playout URL, but this code get it explicitly from the client instead of parsing it off of the URL. At this point, the client has cached this token, so it will be the same as the previous one and will not require any additional requests.

 ##### Playing HLS
 
 ```javascript
const PlayHLS = (video, playoutOptions) => {
  const playoutUrl =`${playoutOptions.hls.playoutUrl}&player_profile=hls-js`;
  
  const player = new Hls();
  player.loadSource(playoutUrl);
  player.attachMedia(video);

  // Autoplay
  player.on(Hls.Events.MANIFEST_PARSED, () => {
    video.play();
  });
};
```

Playing HLS is quite straightforward. Only one minor tweak is necessary - when using hls.js with AES-128, the player profile for hls.js must be specified in the playout URL.


##### Playing Dash

```javascript
const PlayDash = (authToken, video, playoutOptions) => {
  const player = dashjs.MediaPlayer().create();

  if(playoutOptions.dash.drms) {
    const widevineUrl = playoutOptions.dash.drms.widevine.licenseServers
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

  player.initialize(video, playoutOptions.dash.playoutUrl, true);
};
```

Playing Dash is also straightforward, but some extra work must be done to set up Widevine.

First, the Widevine server URL for the content must be specified. This code selects only an HTTPS url to avoid issues with mixed content when the app is using HTTPS.

And secondly, the authorization token we retrieved before must be specified in the Widevine request headers. We also specify withCredentials=false to avoid CORS issues.


#### Step 4 - Watch

At this point, you should have fast, high quality video in your player, freshly transcoded from the Fabric.


