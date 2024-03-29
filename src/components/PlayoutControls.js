import React from "react";
import {inject, observer} from "mobx-react";
import {Action, Copy, ImageIcon} from "elv-components-js";
import ClipboardIcon from "../static/icons/clipboard.svg";

@inject("rootStore")
@inject("videoStore")
@observer
class PlayoutControls extends React.Component {
  DRMS(protocol) {
    let drms = protocol === "dash" ?
      ["clear", "widevine"] : ["clear", this.props.videoStore.aesOption];

    if(this.props.videoStore.playoutOptions) {
      drms = Object.keys(this.props.videoStore.playoutOptions[protocol].playoutMethods)
        .sort((a) => a === "clear" ? -1 : 1);
    }

    drms = drms.filter(drm => this.props.rootStore.availableDRMs.includes(drm));

    return drms;
  }

  DRMSelection() {
    return (
      <div className="control-row">
        {
          this.DRMS(this.props.videoStore.protocol).map(drm =>
            <Action
              key={`drm-selection-${drm}`}
              onClick={() => this.props.videoStore.SetDRM(drm)}
              className={this.props.videoStore.drm === drm ? "" : "secondary"}
            >
              { this.props.videoStore.displayMap[drm] }
            </Action>
          )
        }
      </div>
    );
  }

  ProtocolSelection() {
    let protocols = ["dash", "hls"];

    if(this.props.videoStore.playoutOptions) {
      protocols = Object.keys(this.props.videoStore.playoutOptions);
    }

    // Hide protocol option if no DRM options are available
    protocols = protocols.filter(protocol => this.DRMS(protocol).length > 0);

    if(!this.props.videoStore.dashjsSupported) {
      protocols = protocols.filter(protocol => protocol !== "dash");
    }

    return (
      <div className="control-row">
        {
          protocols.map(protocol =>
            <Action
              key={`drm-selection-${protocol}`}
              onClick={() => this.props.videoStore.SetProtocol(protocol)}
              className={this.props.videoStore.protocol === protocol ? "" : "secondary"}
            >
              { this.props.videoStore.displayMap[protocol] }
            </Action>
          )
        }
      </div>
    );
  }

  EmbedUrl() {
    if(!this.props.videoStore.embedUrl) { return; }

    const embedFormUrl = new URL(this.props.videoStore.embedUrl);
    embedFormUrl.searchParams.delete("p");

    return (
      <div className="controls-container">
        <h3 className="controls-header">
          Embeddable URL
          <Copy className="copy-button" copy={this.props.videoStore.embedUrl}>
            <ImageIcon icon={ClipboardIcon} />
          </Copy>
          <a className="embed-edit-link" href={embedFormUrl.toString()} target="_blank">
            Edit
          </a>
        </h3>
        <div className="playout-url">
          {this.props.videoStore.embedUrl}
        </div>
      </div>
    );
  }

  render() {
    if(!this.props.videoStore.playoutOptions) { return null; }

    return (
      <div className="controls-container playout-controls">
        { this.EmbedUrl() }
        <h3 className="controls-header">Playout Options</h3>
        { this.ProtocolSelection() }
        { this.DRMSelection() }
      </div>
    );
  }
}

export default PlayoutControls;
