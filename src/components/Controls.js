import React from "react";
import PropTypes from "prop-types";
import {LoadVideo, AvailableDRMs} from "../Utils";
import Video from "./Video";
import Tabs from "elv-components-js/src/components/Tabs";
import Action from "elv-components-js/components/Action";
import {onEnterPressed} from "elv-components-js";
import LoadingElement from "elv-components-js/components/LoadingElement";

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
      versionHash: "hq__5DS92kGeb5v3ktMLaDBNxFnAjshM92APZ98SydiczP7vPguFuyJ4Pgz3rL7EZt1TD1Ks5jHW96",
      videoType: "hls",
      video: undefined,
      availableDRMs: [],
      drm: "aes-128"
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
        video: undefined
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
        error
      });
    }
  }

  DrmSelector() {
    if(this.state.loading) { return null; }

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
    if(this.state.loading) { return null; }

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

  VersionHashEntry() {
    return (
      <div className="version-hash-entry">
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

  ErrorMessage() {
    if(!this.state.error) { return null; }

    return (
      <div className="error-message">
        {this.state.error.message}
      </div>
    );
  }

  Video() {
    if(this.state.loading) { return null; }

    return (
      <Video
        key={`video-${this.state.videoType}`}
        authToken={this.state.video.authToken}
        drm={this.state.drm}
        metadata={this.state.video.metadata}
        playoutOptions={this.state.video.playoutOptions[this.state.videoType]}
        posterUrl={this.state.video.posterUrl}
        videoType={this.state.videoType}
      />
    );
  }

  render() {
    return (
      <div className="controls-container">
        { this.VersionHashEntry() }
        { this.ErrorMessage() }
        { this.Video() }
        <LoadingElement loading={this.state.loading && !this.state.error} fullPage={true}>
          <div className="controls">
            { this.DrmSelector() }
            { this.TypeSelector() }
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
