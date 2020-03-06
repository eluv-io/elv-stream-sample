import React from "react";
import {inject, observer} from "mobx-react";
import {Action} from "elv-components-js";

@inject("videoStore")
@observer
class PlayoutControls extends React.Component {
  DRMSelection() {
    let drms = this.props.videoStore.protocol === "dash" ?
      ["widevine", "clear"] : ["aes-128", "clear"];

    if(this.props.videoStore.playoutOptions) {
      drms = Object.keys(this.props.videoStore.playoutOptions[this.props.videoStore.protocol].playoutMethods)
        .sort((a) => a === "widevine" || a === "aes-128" ? -1 : 1);
    }

    return (
      <div className="control-row">
        {
          drms.map(drm =>
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

  render() {
    return (
      <div className="controls-container playout-controls">
        <h3 className="controls-header">Playout Options</h3>
        { this.ProtocolSelection() }
        { this.DRMSelection() }
      </div>
    );
  }
}

export default PlayoutControls;
