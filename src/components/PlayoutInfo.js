import React from "react";
import {inject, observer} from "mobx-react";
import {Copy, ImageIcon} from "elv-components-js";

import CopyIcon from "../static/icons/copy.svg";

@inject("videoStore")
@observer
class PlayoutInfo extends React.Component {
  LicenseServer() {
    if(
      !this.props.videoStore.playoutOptions ||
      !["widevine", "playready"].includes(this.props.videoStore.drm)
    ) { return; }


    const playoutMethods = this.props.videoStore.playoutOptions[this.props.videoStore.protocol]
      .playoutMethods[this.props.videoStore.drm];

    const licenseServer = playoutMethods.drms[this.props.videoStore.drm].licenseServers[0];

    return (
      <div className="controls-container playout-url">
        <h3 className="controls-header controls-header--secondary">
          License Server URL
          <Copy className="copy-button" copy={licenseServer}>
            <ImageIcon icon={CopyIcon} />
          </Copy>
        </h3>
        <div className="playout-url">
          { licenseServer }
        </div>
      </div>
    );
  }

  PlayoutUrls() {
    if(!this.props.videoStore.playoutOptions) { return; }

    const playoutInfo = this.props.videoStore.playoutOptions[this.props.videoStore.protocol]
      .playoutMethods[this.props.videoStore.drm];
    const playoutUrl = playoutInfo.staticPlayoutUrl || playoutInfo.playoutUrl;

    let embedFormUrl;
    if(this.props.videoStore.embedUrl) {
      embedFormUrl = new URL(this.props.videoStore.embedUrl);
      embedFormUrl.searchParams.delete("p");
      embedFormUrl = embedFormUrl.toString();
    }

    return (
      <>
        {
          !this.props.videoStore.embedUrl ? null :
            <div className="controls-container">
              <h3 className="controls-header controls-header--secondary">
                Embeddable URL
                <Copy className="copy-button" copy={this.props.videoStore.embedUrl}>
                  <ImageIcon icon={CopyIcon}/>
                </Copy>
                <a className="embed-edit-link" href={embedFormUrl.toString()} target="_blank">
                  Edit
                </a>
              </h3>
              <div className="playout-url">
                {this.props.videoStore.embedUrl}
              </div>
            </div>
        }
        {
          !playoutInfo.globalPlayoutUrl ? null :
            <div className="controls-container">
              <h3 className="controls-header controls-header--secondary">
                Global Playout URL
                <Copy className="copy-button" copy={playoutInfo.globalPlayoutUrl}>
                  <ImageIcon icon={CopyIcon}/>
                </Copy>
              </h3>
              <div className="playout-url">
                {playoutInfo.globalPlayoutUrl}
              </div>
            </div>
        }
        <div className="controls-container">
          <h3 className="controls-header controls-header--secondary">
            Playout URL
            <Copy className="copy-button" copy={playoutUrl}>
              <ImageIcon icon={CopyIcon}/>
            </Copy>
          </h3>
          <div className="playout-url">
            {playoutUrl}
          </div>
        </div>
      </>
    );
  }

  render() {
    return (
      <div className="playout-urls-container">
        {this.PlayoutUrls()}
        {this.LicenseServer()}
      </div>
    );
  }
}

export default PlayoutInfo;
