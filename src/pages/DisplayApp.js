import "../static/stylesheets/app.scss";

import React from "react";
import {render} from "react-dom";
import {inject, observer, Provider} from "mobx-react";

import {LoadingElement} from "elv-components-js";

import * as Stores from "../stores";
import Controls from "../components/Controls";

@inject("root")
@observer
class App extends React.Component {
  App() {
    if(!this.props.root.client) {
      return <LoadingElement loading={true} fullPage={true}/>;
    }

    return (
      <Controls noSelection={true} />
    );
  }

  render() {
    return (
      <div className="app-container">
        <header />
        <main>
          { this.App() }
        </main>
        <footer />
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
