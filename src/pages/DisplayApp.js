import "../static/stylesheets/app.scss";

import React from "react";
import {render} from "react-dom";
import {inject, observer, Provider} from "mobx-react";

import {LoadingElement} from "elv-components-js";

import * as Stores from "../stores";

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

  App() {
    return (
      <main className="display-app">
        <Video />
        <Segments />
        <div className="controls controls-section">
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
        <LoadingElement
          loading={!this.props.rootStore.client}
          fullPage={true}
          render={this.App}
        />
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
    </React.Fragment>
  ),
  document.getElementById("app")
);
