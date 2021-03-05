const UInt8ArrayToBase64 = (input) => {
  var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var output = "";
  var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
  var i = 0;

  while (i < input.length) {
    chr1 = input[i++];
    chr2 = i < input.length ? input[i++] : Number.NaN; // Not sure if the index
    chr3 = i < input.length ? input[i++] : Number.NaN; // checks are needed here

    enc1 = chr1 >> 2;
    enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
    enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
    enc4 = chr3 & 63;

    if (isNaN(chr2)) {
      enc3 = enc4 = 64;
    } else if (isNaN(chr3)) {
      enc4 = 64;
    }
    output += keyStr.charAt(enc1) + keyStr.charAt(enc2) +
      keyStr.charAt(enc3) + keyStr.charAt(enc4);
  }

  return output;
};

const Base64ToUInt8Array = (input) => {
  var raw = window.atob(input);
  var rawLength = raw.length;
  var array = new Uint8Array(new ArrayBuffer(rawLength));

  for(let i = 0; i < rawLength; i++)
    array[i] = raw.charCodeAt(i);

  return array;
};

const StringToArray = (string) => {
  //return Buffer.from(string);
  let buffer = new ArrayBuffer(string.length*2); // 2 bytes for each char
  let array = new Uint16Array(buffer);
  for (let i=0, strLen=string.length; i<strLen; i++) {
    array[i] = string.charCodeAt(i);
  }
  return array;
};

const ArrayToString = (array) => {
  //return Buffer.from(array).toString();
  let uint16array = new Uint16Array(array.buffer);
  return String.fromCharCode.apply(null, uint16array);
};

// https://github.com/google/shaka-player/blob/master/lib/util/fairplay_utils.js
const ContentId = (initData) => {
  // The first part is a 4 byte little-endian int, which is the length of the second part.
  const contentId = ArrayToString(initData).slice(2);
  // contentId is passed up as a URI, from which the host must be extracted:
  const link = document.createElement("a");
  link.href = contentId;
  return link.hostname;
};

const ConcatInitDataIdAndCertificate = (initData, id, cert) => {
  if (typeof id == "string") { id = StringToArray(id); }

  // layout is [initData][4 byte: idLength][idLength byte: id][4 byte:certLength][certLength byte: cert]
  let offset = 0;
  let buffer = new ArrayBuffer(initData.byteLength + 4 + id.byteLength + 4 + cert.byteLength);
  let dataView = new DataView(buffer);
  let initDataArray = new Uint8Array(buffer, offset, initData.byteLength);
  initDataArray.set(initData);
  offset += initData.byteLength;

  dataView.setUint32(offset, id.byteLength, true);
  offset += 4;

  let idArray = new Uint16Array(buffer, offset, id.length);
  idArray.set(id);
  offset += idArray.byteLength;

  dataView.setUint32(offset, cert.byteLength, true);
  offset += 4;

  let certArray = new Uint8Array(buffer, offset, cert.byteLength);
  certArray.set(cert);

  return new Uint8Array(buffer, 0, buffer.byteLength);
};

const KeySystem = () => {
  if (WebKitMediaKeys.isTypeSupported("com.apple.fps.1_0", "video/mp4")) {
    return "com.apple.fps.1_0";
  }

  throw "Key System not supported";
};

const licenseRequestReady = async (event, licenseURLs, authToken) => {
  for(const licenseURL of licenseURLs) {
    try {
      const response = await new Promise((resolve, reject) => {
        const session = event.target;
        const message = event.message;
        const request = new XMLHttpRequest();
        request.responseType = "text";
        request.session = session;
        request.addEventListener("load", resolve, false);
        request.addEventListener("error", reject, false);

        const params = {
          "spc": UInt8ArrayToBase64(message),
          "assetId": encodeURIComponent(session.contentId)
        };

        request.open("POST", licenseURL, true);
        request.setRequestHeader("Content-type", "application/json"); //"application/x-www-form-urlencoded");
        request.setRequestHeader("Authorization", "Bearer " + authToken);
        request.send(JSON.stringify(params));
      });

      const request = response.target;
      const session = request.session;
      // response can be of the form: '\n<ckc>base64encoded</ckc>\n'
      // so trim the excess:
      let keyText = request.responseText.trim();
      if(keyText.substr(0, 5) === "<ckc>" && keyText.substr(-6) === "</ckc>") {
        keyText = keyText.slice(5, -6);
      }

      const key = Base64ToUInt8Array(keyText);
      await session.update(key);

      return;
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("License request to", licenseURL, "failed");
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  throw Error("All license server requests failed");
};

const onNeedKey = async (event, certificate, licenseURLs, authToken) => {
  certificate = Base64ToUInt8Array(certificate);

  const video = event.target;
  let initData = event.initData;
  const contentId = ContentId(initData);
  initData = ConcatInitDataIdAndCertificate(initData, contentId, certificate);

  if(!video.webkitKeys) {
    video.webkitSetMediaKeys(new WebKitMediaKeys(KeySystem()));
  }

  if(!video.webkitKeys) { throw "Could not create MediaKeys"; }

  const keySession = video.webkitKeys.createSession("video/mp4", initData);
  if(!keySession) { throw "Could not create key session"; }

  keySession.contentId = contentId;

  // Wait up to 10 seconds for key message
  const keyMessageEvent = await Promise.race([
    new Promise(resolve => setTimeout(resolve, 10000)),
    new Promise(resolve => keySession.addEventListener("webkitkeymessage", resolve, false)),
  ]);

  if(!keyMessageEvent) {
    throw Error("No key message event");
  }

  await licenseRequestReady(keyMessageEvent, licenseURLs, authToken);
};

export function InitializeFairPlayStream({playoutOptions, video}) {
  playoutOptions = playoutOptions.hls.playoutMethods.fairplay;
  const cert = playoutOptions.drms.fairplay.cert;
  const licenseURLs = playoutOptions.drms.fairplay.licenseServers;
  const authToken = decodeURIComponent(
    (playoutOptions.playoutUrl.split("?")[1] || "").split("&").find(param => param.startsWith("authorization=")).replace("authorization=", "")
  );

  new Promise((resolve, reject) => {
    video.addEventListener(
      "webkitneedkey",
      async event => {
        try {
          await onNeedKey(event, cert, licenseURLs, authToken);
          resolve();
        } catch(error) {
          reject(error);
        }
      },
      false
    );
  }).catch(error => {
    // eslint-disable-next-line no-console
    console.log("Error initializing FairPlay video:");
    // eslint-disable-next-line no-console
    console.log(error);
    video.src = "";
  });

  video.src = playoutOptions.playoutUrl;
}
