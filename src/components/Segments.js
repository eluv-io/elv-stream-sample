import React from "react";
import PropTypes from "prop-types";

class Segments extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timingScale: 1000
    };

    this.Segment = this.Segment.bind(this);
  }

  componentDidUpdate(prevProps) {
    if(this.props.segmentData.length === prevProps.segmentData.length) { return; }

    const maxTime = Math.max(
      1000,
      ...(this.props.segmentData.map(segment => segment.latency + segment.downloadTime))
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
        <div className="segments-header">Duration</div>
        <div className="segments-header">Download Rate</div>
        <div className="segments-header">Timing</div>
      </React.Fragment>
    );
  }

  Segment(segment) {
    const latencyWidth = (segment.latency / this.state.timingScale) * 100;
    const downloadWidth = (segment.downloadTime / this.state.timingScale) * 100;

    return (
      <React.Fragment key={`segment-${segment.id}`}>
        <div>{segment.id}</div>
        <div>{segment.quality}</div>
        <div>{`${segment.size.toFixed(2)} MB`}</div>
        <div>{`${segment.duration.toFixed(0)}s`}</div>
        <div>{`${segment.downloadRate.toFixed(1)} mbps`}</div>
        <div className="timing">
          <span
            className="latency"
            style={{width: `${latencyWidth}%`}}
            title={`Latency: ${segment.latency}ms`}
          >
            { segment.latency }
          </span>
          <span
            className="download"
            style={{width: `${downloadWidth}%`}}
            title={`Download: ${segment.downloadTime}ms`}
          >
            { segment.downloadTime }
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
          { this.props.segmentData.map(this.Segment)}
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
