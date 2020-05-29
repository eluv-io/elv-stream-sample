import React from "react";
import {render} from "react-dom";
import {Provider} from "mobx-react";
import * as Stores from "./stores";
import DisplayApp from "./pages/DisplayApp";
import App from "./pages/App";

if(typeof EluvioConfiguration === "undefined") {
  global.EluvioConfiguration = {};
}

render(
  (
    <React.Fragment>
      <Provider {...Stores}>
        { Stores.rootStore.displayAppMode ? <DisplayApp /> : <App /> }
      </Provider>
      <div className="app-version">{EluvioConfiguration.version}</div>
    </React.Fragment>
  ),
  document.getElementById("app")
);
