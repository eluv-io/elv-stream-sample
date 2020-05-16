import "../static/stylesheets/app.scss";

import React from "react";
import {inject, observer} from "mobx-react";
import {ImageIcon, LoadingElement} from "elv-components-js";

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
        <Video />
        <Segments />
        <div className="controls controls-section">
          <PlayoutControls />
          <BufferGraph />
          <PlayoutInfo />
          <AdvancedControls />
        </div>
        <button
          className="dev-mode-button"
          onClick={() => this.props.rootStore.ToggleDevMode(!this.props.rootStore.devMode)}
        />
      </main>
    );
  }

  render() {
    return (
      <div className="app-container">
        <header>
          <div className="header-logo">
            <ImageIcon className="logo" icon={Logo} label="Eluvio" onClick={this.props.rootStore.ReturnToApps}/>
            <h1>
              Video Streaming Sample
            </h1>
          </div>
          { this.SourceLink() }
        </header>
        <LoadingElement
          loading={!this.props.rootStore.client}
          fullPage={true}
          render={this.App}
        />
      </div>
    );
  }
}

export default App;
