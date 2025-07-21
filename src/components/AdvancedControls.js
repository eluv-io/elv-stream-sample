import React from "react";
import {inject, observer} from "mobx-react";
import {Action, JsonInput} from "elv-components-js";

@inject("rootStore")
@inject("videoStore")
@observer
class AdvancedControls extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      authContext: "{}"
    };
  }

  PlayoutUrlParams() {
    return (
      <div className="controls-container">
        <h3 className="controls-header controls-header--secondary">Playout URL Parameters</h3>
        <JsonInput
          name="urlParams"
          value={JSON.stringify(this.props.videoStore.playoutUrlParams, null, 2)}
          className="control-auth-context"
          onChange={event => {
            try {
              this.props.videoStore.SetPlayoutUrlParams(JSON.parse(event.target.value));
            } catch(error) {
              // eslint-disable-next-line no-console
              console.error(error);
            }
          }}
        />
      </div>
    );
  }

  HLSJSOptions() {
    return (
      <div className="controls-container" key={`hls-js-options-${this.props.videoStore.playerProfile}`}>
        <h3 className="controls-header controls-header--secondary">HLS JS Options</h3>
        <JsonInput
          name="hlsjsOptions"
          value={JSON.stringify(this.props.videoStore.hlsjsOptions, null, 2)}
          className="control-auth-context"
          onChange={event => {
            try {
              this.props.videoStore.SetHLSJSOptions(JSON.parse(event.target.value));
            } catch(error) {
              // eslint-disable-next-line no-console
              console.error(error);
            }
          }}
        />
        <div className="controls-link-container">
          <a
            target="_blank"
            rel="noopener"
            className="controls-link"
            href="https://github.com/video-dev/hls.js/blob/master/docs/API.md"
          >
            API Docs
          </a>
        </div>
      </div>
    );
  }

  AuthContext() {
    return (
      <div className="controls-container">
        <h3 className="controls-header controls-header--secondary">Auth Context</h3>
        <JsonInput
          className="control-auth-context"
          name="authContext"
          value={this.state.authContext}
          onChange={async event => {
            this.setState({
              authContext: event.target.value
            });

            let context;
            try {
              context = event.target.value ? JSON.parse(event.target.value) : undefined;
              // eslint-disable-next-line no-empty
            } catch(error) {}

            if(context) {
              await this.props.videoStore.SetAuthContext(context);
            }
          }}
        />
      </div>
    );
  }

  BlockchainNodes() {
    if(!this.props.rootStore.devMode) { return; }

    return (
      <div className="controls-container">
        <h3 className="controls-header controls-header--secondary">Blockchain Node</h3>
        <select
          value={this.props.rootStore.ethNode}
          onChange={event => this.props.rootStore.SetEthNode(event.target.value)}
        >
          <option value="">Automatic</option>
          {
            this.props.rootStore.nodes.ethereumURIs.map(ethNode =>
              <option value={ethNode} key={`eth-node-${ethNode}`}>{ ethNode }</option> )
          }
          <option value="custom">Automatic</option>
        </select>
      </div>
    );
  }

  FabricNodes() {
    return (
      <div className="controls-container">
        <h3 className="controls-header controls-header--secondary">Fabric Node</h3>
        <select
          value={this.props.rootStore.fabricNode}
          onChange={event => this.props.rootStore.SetFabricNode(event.target.value)}
        >
          <option value="">Automatic</option>
          {
            this.props.rootStore.nodes.fabricURIs.map(fabricNode =>
              <option value={fabricNode} key={`fabric-node-${fabricNode}`}>{ fabricNode }</option> )
          }
          <option value="custom">Custom</option>
        </select>
        {
          this.props.rootStore.fabricNode !== "custom" ? null :
            <input
              placeholder="Fabric Node"
              value={this.props.rootStore.customFabricNode}
              onChange={event => this.props.rootStore.SetCustomFabricNode(event.target.value)}
            />
        }
      </div>
    );
  }

  Region() {
    const regions = [
      ["Automatic", ""],

      ["NA Northeast", "na-east-north"],
      ["NA Southeast", "na-east-south"],
      ["NA Northwest", "na-west-north"],
      ["NA Southwest", "na-west-south"],

      ["EU Northeast", "eu-east-north"],
      ["EU Southeast", "eu-east-south"],
      ["EU Northwest", "eu-west-north"],
      ["EU Southwest", "eu-west-south"],

      ["AU East", "au-east"],
      ["AS East", "as-east"]
    ];

    return (
      <div className="controls-container">
        <h3 className="controls-header controls-header--secondary">Region</h3>
        <select
          value={this.props.rootStore.region}
          onChange={event => this.props.rootStore.SetRegion(event.target.value)}
        >
          {
            regions.map(([label, value]) =>
              <option value={value} key={`region-${value}`}>{ label }</option> )
          }
        </select>
      </div>
    );
  }

  PlayoutProfile() {
    return (
      <div className="controls-container">
        <h3 className="controls-header controls-header--secondary">HLS Player Profile</h3>
        <select
          value={this.props.videoStore.playerProfile}
          onChange={event => this.props.videoStore.SetPlayerProfile(event.target.value)}
        >
          <option value="default">Default</option>
          <option value="ll">Low Latency Live</option>
          <option value="ull">Ultra Low Latency Live</option>
        </select>
      </div>
    );
  }

  PlayoutType() {
    return (
      <div className="controls-container">
        <h3 className="controls-header controls-header--secondary">Playout Type</h3>
        <select
          value={this.props.videoStore.playoutType}
          onChange={event => this.props.videoStore.SetPlayoutType(event.target.value)}
        >
          <option value="">Default</option>
          <option value="vod">VOD</option>
        </select>
      </div>
    );
  }

  PlayoutHandler() {
    return (
      <div className="controls-container">
        <h3 className="controls-header controls-header--secondary">Playout Handler</h3>
        <select
          value={this.props.videoStore.playoutHandler}
          onChange={event => this.props.videoStore.SetPlayoutHandler(event.target.value)}
        >
          <option value="playout">Default</option>
          <option value="playout_scte">SCTE</option>
        </select>
      </div>
    );
  }

  render() {
    const toggleButton = (
      <div className="controls-container advanced-controls-toggle">
        <div className="control-row">
          <Action
            className={this.state.visible ? "" : "secondary"}
            onClick={() => this.setState({visible: !this.state.visible})}
          >
            Advanced Controls
          </Action>
        </div>
      </div>
    );

    const reloadButton = (
      <div className="controls-container">
        <div className="control-row">
          <Action
            onClick={async () => {
              await this.props.rootStore.InitializeClient();
              this.props.videoStore.LoadVideo({contentId: this.props.videoStore.contentId});
            }}
          >
            Reload
          </Action>
        </div>
      </div>
    );

    if(!this.state.visible) {
      if(this.props.videoStore.loading) {
        return null;
      }

      return (
        toggleButton
      );
    }

    return (
      <React.Fragment>
        { toggleButton }
        { this.PlayoutHandler() }
        { this.PlayoutType() }
        { this.PlayoutProfile() }
        { this.Region() }
        { this.FabricNodes() }
        { this.BlockchainNodes() }
        { this.AuthContext() }
        { this.HLSJSOptions() }
        { this.PlayoutUrlParams() }
        { reloadButton }
      </React.Fragment>
    );
  }
}

export default AdvancedControls;
