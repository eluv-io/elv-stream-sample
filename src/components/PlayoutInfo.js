import React from "react";
import {inject, observer} from "mobx-react";
import {Copy, ImageIcon} from "elv-components-js";

import CopyIcon from "../static/icons/copy.svg";
import EditIcon from "../static/icons/edit.svg";

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
      <div className="controls-container">
        <h3 className="controls-header controls-header--secondary">
          License Server URL
          <Copy className="copy-button" copy={licenseServer}>
            <ImageIcon icon={CopyIcon} />
          </Copy>
        </h3>
        <h6 className="playout-url">
          { licenseServer }
        </h6>
      </div>
    );
  }

  PlayoutUrls() {
    if(!this.props.videoStore.playoutOptions) { return; }

    const playoutInfo = this.props.videoStore.playoutOptions?.[this.props.videoStore.protocol]
      ?.playoutMethods[this.props.videoStore.drm];

    if(!playoutInfo) { return null; }

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
              <h3 className="controls-header">
                Embeddable URL
                <div className="controls-header-actions">
                  <Copy className="copy-button" copy={this.props.videoStore.embedUrl}>
                    <ImageIcon icon={CopyIcon}/>
                  </Copy>
                  <a className="copy-button" href={embedFormUrl.toString()} target="_blank">
                    <ImageIcon icon={EditIcon} />
                  </a>
                </div>
              </h3>
              <h6 className="playout-url">
                {this.props.videoStore.embedUrl}
              </h6>
            </div>
        }
        {
          !playoutInfo.globalPlayoutUrl ? null :
            <div className="controls-container">
              <h3 className="controls-header">
                Global Playout URL
                <div className="controls-header-actions">
                  <Copy className="copy-button" copy={playoutInfo.globalPlayoutUrl}>
                    <ImageIcon icon={CopyIcon}/>
                  </Copy>
                </div>
              </h3>
              <h6 className="playout-url">
                {playoutInfo.globalPlayoutUrl}
              </h6>
            </div>
        }
        <div className="controls-container">
          <h3 className="controls-header">
            Playout URL
            <div className="controls-header-actions">
              <Copy className="copy-button" copy={playoutUrl}>
                <ImageIcon icon={CopyIcon}/>
              </Copy>
            </div>
          </h3>
          <h6 className="playout-url playout-url--full">
            {playoutUrl}
          </h6>
        </div>
        {
          this.props.videoStore.srtUrl &&
          <div className="controls-container">
            <h3 className="controls-header">
              SRT URL
              <div className="controls-header-actions">
                <Copy className="copy-button" copy={this.props.videoStore.srtUrl}>
                  <ImageIcon icon={CopyIcon}/>
                </Copy>
              </div>
            </h3>
            <h6 className="playout-url">
              {this.props.videoStore.srtUrl}
            </h6>
          </div>
        }
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
