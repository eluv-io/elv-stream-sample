import React from "react";
import PropTypes from "prop-types";
import {LoadVideo, AvailableDRMs} from "../Utils";
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
      versionHash: "hq__49wKscUYfsVgxymBRdKPmTq3DMqZFqhfuZzfnWcLnk56tSXUQjHkbGuiD8BEmCBLykGnmNf87t",
      videoType: "hls",
      video: undefined,
      availableDRMs: [],
      drm: "aes-128",
      sampleWindow: 20,
      samplePeriod: 250
    };

    this.LoadVideo = this.LoadVideo.bind(this);
  }

  async componentDidMount() {
    const availableDRMs = await AvailableDRMs();
    this.setState({availableDRMs});

    await this.LoadVideo();
  }

  async LoadVideo() {
    if(!this.state.versionHash) { return; }

    try {
      this.setState({
        loading: true,
        video: undefined,
        error: undefined
      });

      const {metadata, playoutOptions, posterUrl, authToken} = await LoadVideo({
        client: this.props.client,
        versionHash: this.state.versionHash,
        drm: this.state.drm
      });

      this.setState({
        loading: false,
        videoType: Object.keys(playoutOptions)[0],
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

  DrmSelector() {
    const options = this.state.availableDRMs.map(drm => [Format(drm), drm]);

    return (
      <div className="selection">
        <label htmlFor="drm">DRM</label>
        <Tabs
          options={options}
          selected={this.state.drm}
          onChange={drm => {
            if(this.state.drm === drm) { return; }

            this.setState({
              drm
            }, this.LoadVideo);
          }}
          className="secondary"
        />
      </div>
    );
  }

  TypeSelector() {
    const options = Object.keys(this.state.video.playoutOptions)
      .map(type => [Format(type), type]);

    return (
      <div className="selection">
        <label htmlFor="protocol">Protocol</label>
        <Tabs
          options={options}
          selected={this.state.videoType}
          onChange={type => this.setState({videoType: type})}
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
          onKeyPress={onEnterPressed(() => this.LoadVideo())}
        />
        <Action onClick={this.LoadVideo}>
          Load Content
        </Action>
      </div>
    );
  }

  StreamOptions() {
    if(this.state.loading || this.state.error) { return; }

    return (
      <div className="control-block">
        <h4>Stream Options</h4>
        { this.DrmSelector() }
        { this.TypeSelector() }
      </div>
    );
  }

  /* Graph Options */

  SampleWindow() {
    const options = [
      ["Small", 20],
      ["Medium", 60],
      ["Large", 300]
    ];

    return (
      <div className="selection">
        <label htmlFor="protocol">Window</label>
        <Tabs
          options={options}
          selected={this.state.sampleWindow}
          onChange={value => this.setState({sampleWindow: value})}
          className="secondary"
        />
      </div>
    );
  }

  SamplePeriod() {
    const options = [
      ["Fast", 250],
      ["Medium", 500],
      ["Slow", 1000]
    ];

    return (
      <div className="selection">
        <label htmlFor="protocol">Period</label>
        <Tabs
          options={options}
          selected={this.state.samplePeriod}
          onChange={value => this.setState({samplePeriod: value})}
          className="secondary"
        />
      </div>
    );
  }

  GraphOptions() {
    if(this.state.loading || this.state.error) { return; }

    return (
      <div className="control-block">
        <h4>Graph Options</h4>
        { this.SampleWindow() }
        { this.SamplePeriod() }
      </div>
    );
  }

  Video() {
    if(this.state.loading || this.state.error) { return null; }

    return (
      <Video
        key={`video-${this.state.videoType}`}
        authToken={this.state.video.authToken}
        drm={this.state.drm}
        metadata={this.state.video.metadata}
        playoutOptions={this.state.video.playoutOptions[this.state.videoType]}
        posterUrl={this.state.video.posterUrl}
        videoType={this.state.videoType}
        sampleWindow={this.state.sampleWindow}
        samplePeriod={this.state.samplePeriod}
      />
    );
  }

  render() {
    return (
      <div className="controls-container">
        <LoadingElement loading={this.state.loading && !this.state.error} fullPage={true}>
          { this.ErrorMessage() }
          { this.Video() }
          <div className="controls">
            { this.ContentSelection() }
            { this.StreamOptions() }
            { this.GraphOptions() }
          </div>
        </LoadingElement>
      </div>
    );
  }
}

Controls.propTypes = {
  client: PropTypes.object.isRequired
};

export default Controls;
