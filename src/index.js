import "./static/stylesheets/app.scss";

import React from "react";
import {render} from "react-dom";
import {ImageIcon, LoadingElement} from "elv-components-js";
import Controls from "./components/Controls";
import {InitializeClient} from "./Utils";
import GithubIcon from "./static/icons/github.svg";

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
      <Controls client={this.state.client}/>
    );
  }

  render() {
    return (
      <div className="app-container">
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
