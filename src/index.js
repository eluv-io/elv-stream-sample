import "./static/stylesheets/app.scss";

import React from "react";
import { render } from "react-dom";
import { LoadingElement } from "elv-components-js";
import Controls from "./components/Controls";
import {InitializeClient} from "./Utils";

class App extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      client: undefined
    };
  }

  async componentDidMount() {
    if(this.state.client) { return; }

    this.setState({
      client: await InitializeClient()
    });
  }

  App() {
    if(!this.state.client) {
      return <LoadingElement loading={true} fullPage={true}/>;
    }

    return (
      <Controls client={this.state.client}/>
    );
  }

  render() {
    const sourceUrl = "https://github.com/eluv-io/stream-sample";
    return (
      <div className="app-container">
        <main>
          { this.App() }
        </main>
        <footer>
          Source available at <a href={sourceUrl} target="_blank">{ sourceUrl }</a>
        </footer>
      </div>
    );
  }
}

render(
  <App />,
  document.getElementById("app")
);
