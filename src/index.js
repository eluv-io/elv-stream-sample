import "./static/stylesheets/app.scss";

import React from "react";
import {render} from "react-dom";
import {IconLink, ImageIcon, LoadingElement} from "elv-components-js";
import Controls from "./components/Controls";
import {AvailableDRMs, InitializeClient} from "./Utils";

import Logo from "./static/images/Logo.png";
import GithubIcon from "./static/icons/github.svg";

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      client: undefined,
      availableProtocols: []
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
      <Controls client={this.state.client} availableProtocols={this.state.availableProtocols} />
    );
  }

  render() {
    return (
      <div className="app-container">
        <header>
          <IconLink href="https://eluv.io" className="logo" icon={Logo} label="Eluvio"/>
          <h1>
            Video Streaming Sample
          </h1>
        </header>
        <main>
          { this.App() }
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
