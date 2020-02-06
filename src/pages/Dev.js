import "../static/stylesheets/app.scss";
import "../static/stylesheets/dev.scss";

import React from "react";
import {render} from "react-dom";
import {inject, observer, Provider} from "mobx-react";

import {IconLink, ImageIcon, LoadingElement} from "elv-components-js";

import * as Stores from "../stores";
import Controls from "../components/Controls";

import Logo from "../static/images/Logo.png";
import GithubIcon from "../static/icons/github.svg";
import Tabs from "elv-components-js/src/components/Tabs";

@inject("root")
@inject("video")
@observer
class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      version: 0
    };

    props.root.SetDevMode();
  }

  RegionSelection() {
    const regions = [
      ["auto", ""],
      ["na-west-north", "na-west-north"],
      ["na-west-south", "na-west-south"],
      ["na-east", "na-east"],
      ["eu-west", "eu-west"]
    ];

    return (
      <React.Fragment>
        <h3>Region</h3>
        <Tabs
          className="vertical-tabs secondary region-selection"
          selected={this.props.root.region}
          options={regions}
          onChange={region => {
            this.props.root.InitializeClient(region);
          }}
        />
      </React.Fragment>
    );
  }

  NodeInfo() {
    return (
      <React.Fragment>
        <h3>Fabric Nodes</h3>
        { this.props.root.nodes.fabricURIs.map(uri =>
          <div key={`fabric-uri-${uri}`} className="node-uri">{uri}</div>
        )}
        <h3>Blockchain Nodes</h3>
        { this.props.root.nodes.ethereumURIs.map(uri =>
          <div key={`blockchain-uri-${uri}`} className="node-uri">{uri}</div>
        )}
      </React.Fragment>
    );
  }

  PlayoutInfo() {
    if(!this.props.video.playoutOptions) { return; }
    let playoutOptions = this.props.video.playoutOptions[this.props.video.protocol];
    playoutOptions = playoutOptions && playoutOptions.playoutMethods[this.props.video.drm];
    const playoutUrl = playoutOptions && playoutOptions.playoutUrl;
    return (
      <React.Fragment>
        <h3>Playout URLs</h3>
        {Object.keys(this.props.video.playoutOptions).map(protocol => {
          return (
            <React.Fragment>
              <h4>{protocol}</h4>
              <div className="node-uri">{playoutUrl}</div>
            </React.Fragment>
          );
        })}
      </React.Fragment>
    );
  }

  AdvancedOptions() {
    if(!this.props.root.client) { return; }

    return (
      <div className="advanced-options node-info controls-container">
        <div className="controls">
          <div className="control-block">
            { this.RegionSelection() }
            { this.NodeInfo() }
            { this.PlayoutInfo() }
          </div>
        </div>
      </div>
    );
  }

  SourceLink() {
    const sourceUrl = "https://github.com/eluv-io/stream-sample";
    return (
      <a className="source-link" href={sourceUrl} target="_blank">
        <ImageIcon className="github-icon" icon={GithubIcon} />
        Source available on GitHub
      </a>
    );
  }

  App() {
    if(!this.props.root.client) {
      return <LoadingElement loading={true} fullPage={true}/>;
    }

    return (
      <React.Fragment>
        <Controls />
      </React.Fragment>
    );
  }

  render() {
    return (
      <div className="app-container" key={this.state.version}>
        <header>
          <IconLink href="https://eluv.io" className="logo" icon={Logo} label="Eluvio"/>
          <h1>
            Video Streaming Sample
          </h1>
        </header>
        <main>
          <div className="two-column">
            { this.App() }
            { this.AdvancedOptions() }
          </div>
        </main>
        <footer>
          { this.SourceLink() }
        </footer>
      </div>
    );
  }
}

render(
  (
    <Provider {...Stores}>
      <App />
    </Provider>
  ),
  document.getElementById("app")
);
