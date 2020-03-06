import React from "react";
import {inject, observer} from "mobx-react";
import {Copy, ImageIcon} from "elv-components-js";

import ClipboardIcon from "../static/icons/clipboard.svg";

@inject("videoStore")
@observer
class PlayoutInfo extends React.Component {
  LicenseServer() {
    if(
      !this.props.videoStore.playoutOptions ||
      this.props.videoStore.protocol !== "dash" ||
      this.props.videoStore.drm !== "widevine"
    ) { return; }


    const playoutMethods = this.props.videoStore.playoutOptions[this.props.videoStore.protocol]
      .playoutMethods[this.props.videoStore.drm];

    const licenseServer = playoutMethods.drms.widevine.licenseServers[0];

    return (
      <div className="controls-container playout-url">
        <h3 className="controls-header">
          License Server
          <Copy className="copy-button" copy={licenseServer}>
            <ImageIcon icon={ClipboardIcon} />
          </Copy>
        </h3>
        <div className="playout-url">
          { licenseServer }
        </div>
      </div>
    );
  }

  PlayoutUrl() {
    if(!this.props.videoStore.playoutOptions) { return; }

    const playoutUrl = this.props.videoStore.playoutOptions[this.props.videoStore.protocol]
      .playoutMethods[this.props.videoStore.drm].playoutUrl;

    return (
      <div className="controls-container playout-url">
        <h3 className="controls-header">
          Playout URL
          <Copy className="copy-button" copy={playoutUrl}>
            <ImageIcon icon={ClipboardIcon} />
          </Copy>
        </h3>
        <div className="playout-url">
          { playoutUrl }
        </div>
      </div>
    );
  }

  render() {
    return (
      <React.Fragment>
        { this.PlayoutUrl() }
        { this.LicenseServer() }
      </React.Fragment>
    );
  }
}

export default PlayoutInfo;
