import React from "react";
import {inject, observer} from "mobx-react";
import {Action} from "elv-components-js";

@inject("rootStore")
@observer
class AdvancedControls extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      visible: props.rootStore.manualNodeSelection
    };
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
      ["AU East", "au-east"]
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
        { this.Region() }
        { this.FabricNodes() }
        { this.BlockchainNodes() }
      </React.Fragment>
    );
  }
}

export default AdvancedControls;
