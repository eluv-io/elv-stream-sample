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
      visible: props.rootStore.manualNodeSelection,
      authContext: "{}"
    };
  }

  AuthContext() {
    return (
      <div className="controls-container">
        <h3 className="controls-header">Auth Context</h3>
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
        <h3 className="controls-header">Blockchain Node</h3>
        <select
          value={this.props.rootStore.ethNode}
          onChange={event => this.props.rootStore.InitializeClient(this.props.rootStore.region, this.props.rootStore.fabricNode, event.target.value)}
        >
          {
            this.props.rootStore.nodes.ethereumURIs.map(ethNode =>
              <option value={ethNode} key={`eth-node-${ethNode}`}>{ ethNode }</option> )
          }
        </select>
      </div>
    );
  }

  FabricNodes() {
    return (
      <div className="controls-container">
        <h3 className="controls-header">Fabric Node</h3>
        <select
          value={this.props.rootStore.fabricNode}
          onChange={event => this.props.rootStore.InitializeClient(this.props.rootStore.region, event.target.value, this.props.rootStore.ethNode)}
        >
          {
            this.props.rootStore.nodes.fabricURIs.map(fabricNode =>
              <option value={fabricNode} key={`fabric-node-${fabricNode}`}>{ fabricNode }</option> )
          }
        </select>
      </div>
    );
  }

  Region() {
    const regions = [
      ["Automatic", ""],
      ["NA Northwest", "na-west-north"],
      ["NA Southwest", "na-west-south"],
      ["NA East", "na-east"],
      ["EU West", "eu-west"],
      ["EU East", "eu-east"],
      ["AU East", "au-east"],
      ["AS East", "as-east"]
    ];

    return (
      <div className="controls-container">
        <h3 className="controls-header">Region</h3>
        <select
          value={this.props.rootStore.region}
          onChange={event => this.props.rootStore.InitializeClient(event.target.value)}
        >
          {
            regions.map(([label, value]) =>
              <option value={value} key={`region-${value}`}>{ label }</option> )
          }
        </select>
      </div>
    );
  }

  Offerings() {
    const offerings = this.props.videoStore.availableOfferings;
    if(!offerings || Object.keys(offerings).length === 0) { return null; }

    return (
      <div className="controls-container">
        <h3 className="controls-header">Offering</h3>
        <select
          value={this.props.videoStore.offering}
          onChange={event => this.props.videoStore.SetOffering(event.target.value)}
        >
          {
            Object.keys(offerings).map(offeringKey =>
              <option value={offeringKey} key={`offering-${offeringKey}`}>{ offerings[offeringKey].display_name || offeringKey }</option> )
          }
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

    if(!this.state.visible) {
      return (
        toggleButton
      );
    }

    return (
      <React.Fragment>
        { toggleButton }
        { this.Offerings() }
        { this.Region() }
        { this.FabricNodes() }
        { this.BlockchainNodes() }
        { this.AuthContext() }
      </React.Fragment>
    );
  }
}

export default AdvancedControls;
