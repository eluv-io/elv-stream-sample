import React from "react";
import {inject, observer} from "mobx-react";
import Video from "./Video";
import {onEnterPressed} from "elv-components-js";
import {Action, LoadingElement, Tabs} from "elv-components-js";
import Metrics from "./Metrics";

// Appropriately capitalize options
const Format = (string) => {
  if(string === "hls") {
    return "HLS";
  }

  if(string === "aes-128") {
    return "AES-128";
  }

  return string.charAt(0).toUpperCase() + string.slice(1);
};

@inject("root")
@inject("video")
@inject("metrics")
@observer
class Controls extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      showControls: false,
      currentVideoIndex: 0,
      versionHash: props.video.availableContent[0].versionHash
    };

    this.LoadVideo = this.LoadVideo.bind(this);
    this.PlayNext = this.PlayNext.bind(this);
  }

  async componentDidMount() {
    await this.LoadVideo(this.props.video.protocol);
  }

  async LoadVideo(protocol) {
    if(!this.state.versionHash) { return; }

    await this.props.video.LoadVideo({
      versionHash: this.state.versionHash,
      protocol: protocol
    });
  }

  async PlayNext() {
    await new Promise(resolve => setTimeout(resolve, 3000));

    const nextVideoIndex = (this.state.currentVideoIndex + 1) % this.props.video.availableContent.length;

    this.setState({
      currentVideoIndex: nextVideoIndex,
      versionHash: this.props.video.availableContent[nextVideoIndex].versionHash
    });

    await this.LoadVideo(this.props.video.protocol);
  }

  ErrorMessage() {
    if(!this.props.video.error) { return null; }

    return (
      <div className="error-message">
        {this.props.video.error}
      </div>
    );
  }

  /* Stream Options */

  ProtocolSelection() {
    const options = Object.keys(this.props.video.playoutOptions).map(type => [Format(type), type]);

    return (
      <div className="selection">
        <label htmlFor="protocol">Protocol</label>
        <Tabs
          options={options}
          selected={this.props.video.protocol}
          onChange={protocol => this.LoadVideo(protocol)}
          className="secondary"
        />
      </div>
    );
  }

  DrmSelection() {
    const options = this.props.video.availableDRMs.map(drm => [Format(drm), drm]);

    return (
      <div className="selection">
        <label htmlFor="drm">DRM</label>
        <Tabs
          options={options}
          selected={this.props.video.drm}
          onChange={drm => this.props.video.SetDRM(drm)}
          className="secondary"
        />
      </div>
    );
  }

  ContentSelection() {
    const availableContentOptions =
      this.props.video.availableContent.map(({title, versionHash}) => [title, versionHash]);

    return (
      <div className="control-block content-selection">
        <Tabs
          options={availableContentOptions}
          selected={this.state.versionHash}
          onChange={versionHash => {
            this.setState({
              versionHash,
            }, () => this.LoadVideo(this.props.video.protocol));
          }}
          className="available-content secondary vertical-tabs"
          tabClassName="available-content-selection"
        />

        <input
          type="text"
          placeholder="Version Hash"
          value={this.state.versionHash}
          onChange={(event) => this.setState({versionHash: event.target.value})}
          onKeyPress={onEnterPressed(() => this.LoadVideo(this.props.video.protocol))}
        />
        <Action onClick={() => this.LoadVideo(this.props.video.protocol)}>
          Load
        </Action>
      </div>
    );
  }

  GraphScale() {
    const options = [
      ["20s", 20],
      ["60s", 60],
      ["300s", 300]
    ];

    return (
      <div className="selection">
        <label htmlFor="protocol">Graph Scale</label>
        <Tabs
          options={options}
          selected={this.props.metrics.sampleWindow}
          onChange={value => this.props.metrics.SetSampleWindow(value)}
          className="secondary"
        />
      </div>
    );
  }

  StreamOptions() {
    if(this.props.video.loading || this.props.video.error) { return; }

    return (
      <div className="control-block">
        <h4>Stream Options</h4>
        <div className="selection-container">
          { this.ProtocolSelection() }
          { this.DrmSelection() }
          { this.GraphScale() }
        </div>
      </div>
    );
  }

  ControlsSection() {
    if(this.props.video.error) { return null; }

    const toggleButton = (
      <div
        onClick={() => this.setState({showControls: !this.state.showControls})}
        className="toggle-controls"
      >
        {this.state.showControls ? "▲ Hide Controls" : "▼ Show Controls"}
      </div>
    );

    return (
      <React.Fragment>
        { toggleButton }
        <div className={`controls ${this.state.showControls ? "" : "hidden"}`}>
          { this.StreamOptions() }
        </div>
      </React.Fragment>
    );
  }

  Metrics() {
    if(!this.props.video.hlsjsSupported) { return null; }

    return <Metrics />;
  }

  Video() {
    if(this.props.video.loading || this.props.video.error) { return null; }

    return (
      <React.Fragment>
        <Video
          key={`video-${this.props.video.protocol}-${this.props.video.drm}`}
          onMediaEnded={this.PlayNext}
        />
        { this.Metrics() }
      </React.Fragment>
    );
  }

  render() {
    return (
      <div className="controls-container">
        { this.ContentSelection() }
        <LoadingElement loading={this.props.video.loading && !this.props.video.error} fullPage>
          { this.ErrorMessage() }
          { this.Video() }
          { this.ControlsSection() }
        </LoadingElement>
      </div>
    );
  }
}

export default Controls;
