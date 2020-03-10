import "../static/stylesheets/app.scss";

import React from "react";
import {render} from "react-dom";
import {inject, observer, Provider} from "mobx-react";

import {IconLink, ImageIcon, LoadingElement} from "elv-components-js";

import * as Stores from "../stores";

import Logo from "../static/images/Logo.png";
import GithubIcon from "../static/icons/github.svg";
import ContentInfo from "../components/ContentInfo";
import Video from "../components/Video";
import Segments from "../components/Segments";
import PlayoutControls from "../components/PlayoutControls";
import BufferGraph from "../components/Graph";
import PlayoutInfo from "../components/PlayoutInfo";
import AdvancedControls from "../components/AdvancedControls";

@inject("rootStore")
@observer
class App extends React.Component {
  constructor(props) {
    super(props);

    this.App = this.App.bind(this);
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
    return (
      <main>
        <ContentInfo />
        <div className="video-section">
          <Video />
          <Segments />
        </div>
        <div className="controls-section">
          <PlayoutControls />
          <BufferGraph />
          <PlayoutInfo />
          <AdvancedControls />
        </div>
      </main>
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
        <LoadingElement
          loading={!this.props.rootStore.client}
          fullPage={true}
          render={this.App}
        />
        <footer>
          { this.SourceLink() }
        </footer>
      </div>
    );
  }
}

render(
  (
    <React.Fragment>
      <Provider {...Stores}>
        <App />
      </Provider>
      <div className="app-version">{EluvioConfiguration.version}</div>
    </React.Fragment>
  ),
  document.getElementById("app")
);
