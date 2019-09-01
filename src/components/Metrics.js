import React from "react";
import Graph from "./Graph";
import Segments from "./Segments";
import {inject, observer} from "mobx-react";

@inject("metrics")
@observer
class Metrics extends React.Component {
  render() {
    return (
      <div className="metrics-container">
        <Graph
          name="Buffer Level (s)"
          data={this.props.metrics.bufferData}
          color={"#00589d"}
          windowSize={this.props.metrics.sampleWindow}
        />
        <Segments />
      </div>
    );
  }
}

export default Metrics;
