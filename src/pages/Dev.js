import "../static/stylesheets/app.scss";

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
@observer
class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      version: 0
    };
  }

  FabricUrlSelection() {
    if(!this.props.root.client) { return; }

    const options = this.props.root.client.HttpClient.uris.map((uri, i) => [uri, i]);

    return (
      <Tabs
        className="vertical-tabs secondary"
        selected={this.props.root.client.HttpClient.uriIndex}
        options={options}
        onChange={i => {
          this.props.root.client.HttpClient.uriIndex = i;
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
    if(!this.props.root.client) {
      return <LoadingElement loading={true} fullPage={true}/>;
    }

    return (
      <Controls />
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
  (
    <Provider {...Stores}>
      <App />
    </Provider>
  ),
  document.getElementById("app")
);
