import "./static/stylesheets/app.scss";
import "./static/stylesheets/dev.scss";

import React from "react";
import {render} from "react-dom";
import {IconLink, ImageIcon, LoadingElement} from "elv-components-js";
import Controls from "./components/Controls";
import {AvailableDRMs, InitializeClient} from "./Utils";

import Logo from "./static/images/Logo.png";
import GithubIcon from "./static/icons/github.svg";
import Tabs from "elv-components-js/src/components/Tabs";

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      client: undefined,
      availableProtocols: [],
      version: 0
    };
  }

  async componentDidMount() {
    if(this.state.client) { return; }

    let availableProtocols = ["hls"];
    if((await AvailableDRMs()).includes("widevine")) {
      availableProtocols.push("dash");
    }

    this.setState({
      client: await InitializeClient(),
      availableProtocols
    });
  }

  FabricUrlSelection() {
    if(!this.state.client) { return; }

    const options = this.state.client.HttpClient.uris.map((uri, i) => [uri, i]);

    return (
      <Tabs
        className="vertical-tabs secondary"
        selected={this.state.client.HttpClient.uriIndex}
        options={options}
        onChange={i => {
          this.state.client.HttpClient.uriIndex = i;
          this.setState({version: this.state.version + 1});
        }}
      />
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
    if(!this.state.client) {
      return <LoadingElement loading={true} fullPage={true}/>;
    }

    return (
      <Controls
        key={this.state.version}
        client={this.state.client}
        availableProtocols={this.state.availableProtocols}
      />
    );
  }

  render() {
    return (
      <div className="app-container">
        <header>
          <IconLink href="https://eluv.io" className="logo" icon={Logo} label="Eluvio"/>
          <h1>
            Video Test
          </h1>
        </header>
        <main>
          { this.App() }
          <div className="advanced-options">
            { this.FabricUrlSelection() }
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
  <App />,
  document.getElementById("app")
);
