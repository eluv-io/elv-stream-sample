import React from "react";
import {inject, observer} from "mobx-react";
import {Scatter} from "react-chartjs-2";
import {toJS} from "mobx";

class Graph extends React.Component {
  render() {
    const xMax = Math.max(...(this.props.data.map(point => point.x)), this.props.windowSize);

    return (
      <div className="graph-container controls-container">
        <h3 className="controls-header">{this.props.name}</h3>
        <Scatter
          options={
            ({
              animation: false,
              legend: {
                display: false
              },
              title: {
                display: false
              },
              scales: {
                yAxes: [{
                  display: true,
                  ticks: {
                    min: 0,
                    stepSize: 10,
                    suggestedMax: 30,
                    fontSize: 10
                  }
                }],
                xAxes: [{
                  display: true,
                  ticks: {
                    // Hide edge labels as graph scrolls
                    callback: value => value % 5 === 0 ? value : "",
                    min: xMax - this.props.windowSize,
                    max: xMax,
                    stepSize: 10,
                    fontSize: 10
                  }
                }]
              }
            })
          }
          data={
            ({

              datasets: [{
                showLine: true,
                data: toJS(this.props.data),
                borderCapStyle: "square",
                borderColor: "#1b73e8",
                borderWidth: 2,
                lineTension: 0,
                pointRadius: 0,
                fill: false,
                showTooltips: false
              }]
            })
          }
        />
      </div>
    );
  }
}

@inject("metricsStore")
@inject("videoStore")
@observer
class BufferGraph extends React.Component {
  render() {
    if(!this.props.videoStore.playoutOptions) { return null; }

    return (
      <Graph
        name="Buffer Level (seconds)"
        data={this.props.metricsStore.bufferData}
        color={"#00589d"}
        windowSize={this.props.metricsStore.sampleWindow}
      />
    );
  }
}

export default BufferGraph;
