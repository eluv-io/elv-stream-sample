import React from "react";
import PropTypes from "prop-types";

import {inject, observer} from "mobx-react";

@inject("metrics")
@observer
class Segments extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timingScale: 1000
    };

    this.Segment = this.Segment.bind(this);
  }

  componentDidUpdate(prevProps) {
    if(this.props.metrics.segmentData.length === prevProps.metrics.segmentData.length) { return; }

    const maxTime = Math.max(
      ...(this.props.metrics.segmentData.map(segment => segment.duration * 1000)),
      ...(this.props.metrics.segmentData.map(segment => segment.latency + segment.downloadTime))
    );

    this.setState({
      timingScale: maxTime
    });
  }

  Header() {
    return (
      <React.Fragment>
        <div className="segments-header">ID</div>
        <div className="segments-header">Quality</div>
        <div className="segments-header">Size</div>
        <div className="segments-header">Download Rate</div>
        <div className="segments-header">Timing (ms)</div>
      </React.Fragment>
    );
  }

  Segment(segment, i) {
    const duration = Math.round(segment.duration) * 1000;
    const durationWidth = (duration/ this.state.timingScale) * 100;
    const latencyWidth = (segment.latency / this.state.timingScale) * 100;
    const downloadWidth = (segment.downloadTime / this.state.timingScale) * 100;

    return (
      <React.Fragment key={`segment-${i}`}>
        <div>{segment.id}</div>
        <div>{segment.quality}</div>
        <div>{`${segment.size.toFixed(2)} MB`}</div>
        <div>{`${segment.downloadRate.toFixed(1)} Mbps`}</div>
        <div className="timing">
          <span
            className="duration"
            style={{width: `${durationWidth}%`}}
            title={`Segment duration: ${duration.toFixed(0)}`}
          >
            { duration.toFixed(0) }
          </span>
          <span
            className="latency"
            style={{width: `${latencyWidth}%`}}
            title={`Latency: ${segment.latency.toFixed(0)}ms`}
          >
            { segment.latency.toFixed(0) }
          </span>
          <span
            className="download"
            style={{width: `${downloadWidth}%`}}
            title={`Download: ${segment.downloadTime.toFixed(0)}ms`}
          >
            { segment.downloadTime.toFixed(0) }
          </span>
        </div>
      </React.Fragment>
    );
  }

  render() {
    return (
      <div className="segments-container">
        <h3>Segment Metrics</h3>
        <div className="segments">
          { this.Header() }
          { this.props.metrics.segmentData.map(this.Segment)}
        </div>
      </div>
    );
  }
}

Segments.propTypes = {
  segmentData: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string,
      quality: PropTypes.string,
      size: PropTypes.number,
      duration: PropTypes.number,
      latency: PropTypes.number,
      downloadTime: PropTypes.number,
      downloadRate: PropTypes.number
    })
  )
};

export default Segments;
