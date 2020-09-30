import React from "react";
import PropTypes from "prop-types";
import PrettyBytes from "pretty-bytes";

import {inject, observer} from "mobx-react";
import {reaction} from "mobx";

@inject("rootStore")
@inject("metricsStore")
@inject("videoStore")
@observer
class Segments extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      timingScale: 2000,
      // Each time a segment is added, recalculate the maximum segment download time
      DisposeMaxSegmentLengthReaction: reaction(
        () => this.props.metricsStore.segmentData.length,
        () => {
          const maxTime = Math.max(
            ...(this.props.metricsStore.segmentData.map(segment => segment.duration * 1000)),
            ...(this.props.metricsStore.segmentData.map(segment => (segment.latency + segment.downloadTime) * 1000))
          );

          this.setState({
            timingScale: maxTime
          });
        }
      )
    };

    this.Segment = this.Segment.bind(this);
  }

  Header() {
    return (
      <div className="segments-header">
        <div className="segments-header-column">ID</div>
        <div className="segments-header-column">Quality</div>
        <div className="segments-header-column">Size</div>
        <div className="segments-header-column">Download Rate</div>
        <div className="segments-header-column">Throughput</div>
        <div className="segments-header-column">Timing (ms)</div>
      </div>
    );
  }

  Segment(segment, i) {
    const latency = segment.latency * 1000;
    const downloadTime = segment.downloadTime * 1000;

    const duration = Math.round(segment.duration) * 1000;
    const durationWidth = (duration / this.state.timingScale) * 100;
    const latencyWidth = (latency / this.state.timingScale) * 100;
    const downloadWidth = (downloadTime / this.state.timingScale) * 100;

    return (
      <div className={`segment-row ${parseInt(segment.id) % 2 === 0 ? "even" : "odd"}`} key={`segment-${i}`}>
        <div>{segment.id}</div>
        <div>{segment.quality}</div>
        <div>{`${segment.size.toFixed(2)} MB`}</div>
        <div>{`${PrettyBytes(segment.downloadRate, {bits: true}) }/s`}</div>
        <div>{`${PrettyBytes(segment.fullDownloadRate, {bits: true}) }/s`}</div>
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
            title={`Latency: ${latency.toFixed(0)}ms`}
          >
            { latency.toFixed(0) }
          </span>
          <span
            className="download"
            style={{width: `${downloadWidth}%`}}
            title={`Download: ${downloadTime.toFixed(0)}ms`}
          >
            { downloadTime.toFixed(0) }
          </span>
        </div>
      </div>
    );
  }

  PlayerEstimate() {
    if(!this.props.rootStore.devMode) { return; }

    return (
      <span>
        Player Bandwidth Estimate:
        <span className="bandwidth-estimate">
          { PrettyBytes(this.props.videoStore.bandwidthEstimate || 0, {bits: true}) }/s
        </span>
      </span>
    );
  }

  render() {
    if(!this.props.videoStore.playoutOptions || !this.props.videoStore.metricsSupported) { return null; }

    return (
      <div className="segments segments-container">
        <h3 className="controls-header">
          <span>
            Segment Metrics
          </span>
          { this.PlayerEstimate() }
        </h3>
        <div className="segments-table">
          { this.Header() }
          <div className={"segments"}>
            { this.props.metricsStore.segmentData.map(this.Segment)}
          </div>
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
