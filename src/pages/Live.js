import "../static/stylesheets/app.scss";

import React from "react";
import {render} from "react-dom";
import {inject, observer, Provider} from "mobx-react";

import {IconLink, ImageIcon, LoadingElement} from "elv-components-js";

import * as Stores from "../stores";
import Controls from "../components/Controls";

import Logo from "../static/images/Logo.png";
import GithubIcon from "../static/icons/github.svg";

@inject("root")
@inject("video")
@observer
class App extends React.Component {
  constructor(props) {
    super(props);

    props.video.SetAvailableContent([
      {
        title: "Sky News Live Stream",
        versionHash: "hq__A7k6WSik267szY7rdYRbLfhudH2DJn38WCDDd8FAzmcHdMM4LmWAMDqzAZuPrDJpPzt2gxbkAr",
        header: "Sky News Live Stream"
      }
    ]);
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
      <div className="app-container">
        <header>
          <IconLink href="https://eluv.io" className="logo" icon={Logo} label="Eluvio"/>
          <h1>
            Live Video Streaming Sample
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
  (
    <Provider {...Stores}>
      <App />
    </Provider>
  ),
  document.getElementById("app")
);
