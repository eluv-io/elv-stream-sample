import React from "react";
import PropTypes from "prop-types";
import {LoadVideo} from "../Utils";
import Video from "./Video";
import {onEnterPressed} from "elv-components-js";
import {Action, LoadingElement, Tabs} from "elv-components-js";

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

class Controls extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: true,
      showControls: false,
      versionHash: "hq__EAt4BVedkShkEJxZX7CTiFvhdg7zpwZdaS2cQua9u4bwehBCyeKeFZT5MDYwUMRDMES94Z44M1",
      availableDRMs: [],
      availableProtocols: ["hls", "dash"],
      protocol: "hls",
      video: undefined,
      drm: "aes-128",
      graphScale: 20
    };

    this.LoadVideo = this.LoadVideo.bind(this);
  }

  async componentDidMount() {
    await this.LoadVideo(this.state.protocol);
  }

  async LoadVideo(protocol) {
    if(!this.state.versionHash) { return; }

    try {
      this.setState({
        loading: true,
        video: undefined,
        error: undefined
      });

      const {metadata, playoutOptions, availableDRMs, posterUrl, authToken} = await LoadVideo({
        client: this.props.client,
        versionHash: this.state.versionHash,
        protocol
      });

      this.setState({
        loading: false,
        availableDRMs,
        protocol,
        drm: availableDRMs[0],
        video: {
          metadata,
          playoutOptions,
          posterUrl,
          authToken
        }
      });
    } catch(error) {
      this.setState({
        error,
        loading: false
      });
    }
  }

  ErrorMessage() {
    if(!this.state.error) { return null; }

    return (
      <div className="error-message">
        {this.state.error.message}
      </div>
    );
  }

  /* Stream Options */

  ProtocolSelection() {
    const options = this.state.availableProtocols.map(type => [Format(type), type]);

    return (
      <div className="selection">
        <label htmlFor="protocol">Protocol</label>
        <Tabs
          options={options}
          selected={this.state.protocol}
          onChange={protocol => this.LoadVideo(protocol)}
          className="secondary"
        />
      </div>
    );
  }

  DrmSelection() {
    const options = this.state.availableDRMs.map(drm => [Format(drm), drm]);

    return (
      <div className="selection">
        <label htmlFor="drm">DRM</label>
        <Tabs
          options={options}
          selected={this.state.drm}
          onChange={drm => this.setState({drm})}
          className="secondary"
        />
      </div>
    );
  }

  ContentSelection() {
    if(this.state.loading) { return null; }

    return (
      <div className="control-block content-selection">
        <h4>Load Content</h4>
        <input
          type="text"
          placeholder="Version Hash"
          value={this.state.versionHash}
          onChange={(event) => this.setState({versionHash: event.target.value})}
          onKeyPress={onEnterPressed(() => this.LoadVideo(this.state.protocol))}
        />
        <Action onClick={() => this.LoadVideo(this.state.protocol)}>
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
          selected={this.state.graphScale}
          onChange={value => this.setState({graphScale: value})}
          className="secondary"
        />
      </div>
    );
  }

  StreamOptions() {
    if(this.state.loading || this.state.error) { return; }

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

  Video() {
    if(this.state.loading || this.state.error) { return null; }

    return (
      <Video
        key={`video-${this.state.protocol}-${this.state.drm}`}
        authToken={this.state.video.authToken}
        drm={this.state.drm}
        metadata={this.state.video.metadata}
        playoutOptions={this.state.video.playoutOptions[this.state.protocol]}
        posterUrl={this.state.video.posterUrl}
        protocol={this.state.protocol}
        sampleWindow={this.state.graphScale}
        samplePeriod={250}
      />
    );
  }

  render() {
    return (
      <div className="controls-container">
        <LoadingElement loading={this.state.loading && !this.state.error} fullPage={true}>
          { this.ErrorMessage() }
          { this.ContentSelection() }
          { this.Video() }
          { this.ControlsSection() }
        </LoadingElement>
      </div>
    );
  }
}

Controls.propTypes = {
  client: PropTypes.object.isRequired
};

export default Controls;
