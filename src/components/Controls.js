import React from "react";
import {inject, observer} from "mobx-react";
import Video from "./Video";
import {onEnterPressed} from "elv-components-js";
import {Action, LoadingElement, Tabs} from "elv-components-js";
import RecordingControls from "./RecordingControls";
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

    const urlParams = new URLSearchParams(window.location.search);

    const initialVersionHash =
      urlParams.get("versionHash") ||
      (props.video.availableContent.length > 0 ? props.video.availableContent[0].versionHash : "");

    this.state = {
      showControls: true,
      currentVideoIndex: 0,
      versionHash: initialVersionHash
    };

    this.LoadVideo = this.LoadVideo.bind(this);
    this.PlayNext = this.PlayNext.bind(this);
  }

  ShowControls() {
    if(this.props.video.versionHash && this.props.video.loading) {
      return false;
    }

    return this.props.video.error || this.state.showControls || !this.props.video.versionHash;
  }

  async componentDidMount() {
    await this.LoadVideo(this.props.video.protocol);
  }

  async LoadVideo(protocol) {
    if(!this.state.versionHash) { return; }

    this.setState({showControls: true});

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
    if(this.props.noSelection) { return; }

    const availableContentOptions =
      this.props.video.availableContent.map(({title, versionHash}) => [title, versionHash]);

    return (
      <div className="control-block">
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
          Load Content
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
    let toggleButton;
    if(!this.props.video.loading && !this.props.video.error) {
      toggleButton = (
        <div
          onClick={() => this.setState({showControls: !this.state.showControls})}
          className="toggle-controls"
        >
          {this.ShowControls() ? "▲ Hide Controls" : "▼ Show Controls"}
        </div>
      );
    }

    const notLoaded = !!this.props.video.error || !this.props.video.versionHash;

    return (
      <React.Fragment>
        { toggleButton }
        <div className={`controls ${this.ShowControls() ? "" : "hidden"} ${notLoaded ? "centered" : ""}`}>
          { this.ContentSelection() }
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
        <RecordingControls />
        { this.Metrics() }
      </React.Fragment>
    );
  }

  Content() {
    if(!this.props.video.versionHash) {
      return null;
    }

    return (
      <LoadingElement loading={this.props.video.loading && !this.props.video.error} fullPage>
        { this.Video() }
      </LoadingElement>
    );
  }

  render() {
    return (
      <div className="controls-container">
        { this.ErrorMessage() }
        { this.Content() }
        { this.ControlsSection() }
      </div>
    );
  }
}

export default Controls;
