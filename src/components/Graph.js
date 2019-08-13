import React from "react";
import PropTypes from "prop-types";
import {
  VictoryLine,
  VictoryChart,
  VictoryAxis,
  VictoryTheme,
  VictoryLabel
} from "victory";

class Graph extends React.Component {
  render() {
    let xMax = Math.max(...(this.props.data.map(point => point.x)), 0);
    const xMin = Math.max(0, xMax - this.props.windowSize);
    xMax = xMin + this.props.windowSize;

    const visibleData = this.props.data.filter(({x}) => x >= xMax - (2 * this.props.windowSize));

    let yMax = Math.max(...(visibleData.map(point => point.y)), 0);
    yMax *= 1.1;

    return (
      <div className="graph-container">
        <h3>{this.props.name}</h3>
        <VictoryChart
          height={200}
          padding={{left: 50, bottom: 50}}
          theme={VictoryTheme.material}
          maxDomain={{x: xMax, y: yMax}}
          minDomain={{x: xMin, y: 0}}
        >
          <VictoryAxis
            label="Time (s)"
            axisLabelComponent={<VictoryLabel dy={20}/>}
            style={{
              tickLabels: {fill: "gray", fontSize: 10},
              axisLabel: {fill: "gray"}
            }}
          />
          <VictoryAxis
            dependentAxis
            style={{tickLabels: {fill: "gray", fontSize: 10}}}
          />
          <VictoryLine
            style={{
              data: { stroke: this.props.color, strokeWidth: 1 },
            }}
            data={this.props.data}
          />
        </VictoryChart>
      </div>
    );
  }
}

Graph.propTypes = {
  name: PropTypes.string,
  color: PropTypes.string,
  data: PropTypes.arrayOf(
    PropTypes.shape({
      x: PropTypes.number,
      y: PropTypes.number
    })
  ).isRequired,
  windowSize: PropTypes.number
};

export default Graph;
