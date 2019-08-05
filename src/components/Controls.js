import React from "react";
import PropTypes from "prop-types";
import {LoadVideo, AvailableDRMs} from "../Utils";
import Video from "./Video";
import Tabs from "elv-components-js/src/components/Tabs";

class Controls extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      versionHash: "hq__BKxnV4pungALdVzZe1oSwZJp4P1RLjzwwK9bp8HuFmjcTFM87ewN3pCjpJBgzdzEnb383kKY5H",
      videoType: "hls",
      video: undefined,
      availableDRMs: [],
      drm: undefined
    };

    this.LoadVideo = this.LoadVideo.bind(this);
  }

  async componentDidMount() {
    const availableDRMs = await AvailableDRMs();
    this.setState({availableDRMs});

    await this.LoadVideo();
  }

  async LoadVideo() {
    this.setState({video: undefined});

    const {metadata, playoutOptions, posterUrl, authToken} = await LoadVideo({
      client: this.props.client,
      versionHash: this.state.versionHash,
      drm: this.state.drm
    });

    this.setState({
      videoType: Object.keys(playoutOptions)[0],
      video: {
        metadata,
        playoutOptions,
        posterUrl,
        authToken
      }
    });
  }

  DrmSelector() {
    const options = [["clear", undefined]].concat(this.state.availableDRMs.map(drm => [drm, drm]));

    return (
      <Tabs
        options={options}
        selected={this.state.drm}
        onChange={drm => {
          this.setState({
            drm
          }, this.LoadVideo);
        }}
        className="secondary"
      />
    );
  }

  TypeSelector() {
    if(!this.state.video) { return null; }

    const options = Object.keys(this.state.video.playoutOptions)
      .map(type => [type, type]);

    return (
      <Tabs
        options={options}
        selected={this.state.videoType}
        onChange={type => this.setState({videoType: type})}
        className="secondary"
      />
    );
  }

  Video() {
    if(!this.state.video) { return null; }

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
        { this.Video() }
        <div className="controls">
          { this.DrmSelector() }
          { this.TypeSelector() }
        </div>
      </div>
    );
  }
}

Controls.propTypes = {
  client: PropTypes.object.isRequired
};

export default Controls;
