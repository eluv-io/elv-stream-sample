import React from "react";
import PropTypes from "prop-types";
import HLSPlayer from "../../node_modules/hls.js/dist/hls";
import {BufferHelper} from "../../node_modules/hls.js/src/utils/buffer-helper";

import DashJS from "dashjs";
import URI from "urijs";
import Graph from "./Graph";

class Video extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      bufferData: [],
      latencyData: [],
      bitrateData: [],
      initialTime: undefined,
      player: undefined,
      video: undefined
    };

    this.metricsInterval = null;

    this.InitializeVideo = this.InitializeVideo.bind(this);
  }

  componentWillUnmount(){
    this.StopSampling();
  }

  componentDidUpdate(prevProps) {
    // If sample period has changed, restart interval
    if(prevProps.samplePeriod !== this.props.samplePeriod) {
      this.StopSampling();
      this.StartSampling();
    }
  }

  InitializeVideo(video) {
    if(!video) { return; }

    let playoutUrl = this.props.playoutOptions.playoutUrl;

    const player = this.props.videoType === "hls" ?
      this.InitializeHLS(video, playoutUrl) : this.InitializeDash(video, playoutUrl);

    this.setState({
      initialTime: performance.now(),
      player,
      video
    }, this.StartSampling);
  }

  InitializeHLS(video, playoutUrl) {
    playoutUrl = URI(playoutUrl).addSearch("player_profile", "hls-js").toString();

    const player = new HLSPlayer();

    player.loadSource(playoutUrl);
    player.attachMedia(video);

    return player;
  }

  InitializeDash(video, playoutUrl) {
    const player = DashJS.MediaPlayer().create();

    if (this.props.drm === "widevine") {
      const widevineUrl = this.props.playoutOptions.drms.widevine.licenseServers[0];

      player.setProtectionData({
        "com.widevine.alpha": {
          "serverURL": widevineUrl,
          "httpRequestHeaders": {
            "Authorization": `Bearer ${this.props.authToken}`
          },
          "withCredentials": false
        }
      });
    }

    // Subtitles are enabled by default - disable them
    player.on(
      DashJS.MediaPlayer.events.CAN_PLAY,
      () => player.setTextTrack(-1)
    );

    player.initialize(video, playoutUrl);

    return player;
  }

  // Discard old samples that are no longer visible
  TrimSamples() {
    // Max visible samples is 300 seconds times 4 samples per second
    const maxSamples = 300 * 4;

    // Trim after threshold is reached to avoid trimming after every sample
    const trimThreshold = maxSamples * 1.1;

    // Earliest visible time is 300 seconds ago
    const minVisibleTime =  ((performance.now() - this.state.initialTime) / 1000) - 300;

    const trim = data => data.slice(-maxSamples).filter(({x}) => x > minVisibleTime);

    if(this.state.bufferData.length > trimThreshold) {
      this.setState({
        bufferData: trim(this.state.bufferData)
      });
    }

    if(this.state.latencyData.length > trimThreshold) {
      this.setState({
        latencyData: trim(this.state.latencyData)
      });
    }

    if(this.state.bitrateData.length > trimThreshold) {
      this.setState({
        bitrateData: trim(this.state.bitrateData)
      });
    }
  }

  StopSampling() {
    clearInterval(this.metricsInterval);
    this.metricsInterval = undefined;
  }

  StartSampling() {
    if(this.props.videoType === "hls") {
      this.metricsInterval = setInterval(() => {
        const currentTime = (performance.now() - this.state.initialTime) / 1000;
        const stats = this.state.player.streamController.stats;

        if(!stats) { return; }

        const bufferInfo = BufferHelper.bufferInfo(this.state.video, this.state.video.currentTime, 0);
        const bitrate = this.state.player.currentLevel >= 0 ? this.state.player.levels[this.state.player.currentLevel].bitrate : 0;

        this.setState({
          bufferData: this.state.bufferData.concat({
            x: currentTime,
            y: (bufferInfo.len) || 0
          }),
          latencyData: this.state.latencyData.concat({
            x: currentTime,
            y: stats.tfirst - stats.trequest
          }),
          bitrateData: this.state.bitrateData.concat({
            x: currentTime,
            y: bitrate / 1000
          }),
        });

        this.TrimSamples();
      }, this.props.samplePeriod);
    } else {
      this.metricsInterval = setInterval(() => {
        const currentTime = (performance.now() - this.state.initialTime) / 1000;
        const dashMetrics = this.state.player.getDashMetrics();

        const bitrateIndex = this.state.player.getQualityFor("video");
        const bitrate = this.state.player.getBitrateInfoListFor("video")[bitrateIndex].bitrate;
        const bufferLevel = dashMetrics.getCurrentBufferLevel("video", true);

        const requests = dashMetrics.getHttpRequests("video");
        const lastRequest =
          requests
            .slice(-20)
            .filter(req =>
              req.responsecode >= 200 &&
              req.responsecode < 300 &&
              req.type === "MediaSegment" &&
              req._stream === "video" &&
              !!req._mediaduration
            ).pop();

        const latency = lastRequest ? lastRequest.tresponse.getTime() - lastRequest.trequest.getTime() : 0;

        this.setState({
          bufferData: this.state.bufferData.concat({
            x: currentTime,
            y: bufferLevel,
          }),
          latencyData: this.state.latencyData.concat({
            x: currentTime,
            y: latency
          }),
          bitrateData: this.state.bitrateData.concat({
            x: currentTime,
            y: bitrate / 1000
          })
        });

        this.TrimSamples();
      }, this.props.samplePeriod);
    }
  }

  render() {
    return (
      <div className="video-container">
        <h1>{this.props.metadata.name}</h1>
        <video
          poster={this.props.posterUrl}
          crossOrigin="anonymous"
          ref={this.InitializeVideo}
          muted={false}
          autoPlay={true}
          controls={true}
          preload="auto"
        />
        <div className="graphs-container">
          <Graph
            name="Buffer Level (s)"
            data={this.state.bufferData}
            color={"#00589d"}
            windowSize={this.props.sampleWindow}
          />
          <Graph
            name="Latency (ms)"
            data={this.state.latencyData}
            color={"#329d61"}
            windowSize={this.props.sampleWindow}
          />
          <Graph
            name="Bitrate (kbps)"
            data={this.state.bitrateData}
            color={"#ff7900"}
            windowSize={this.props.sampleWindow}
          />
        </div>
      </div>
    );
  }
}

Video.propTypes = {
  authToken: PropTypes.string,
  drm: PropTypes.string,
  metadata: PropTypes.object,
  playoutOptions: PropTypes.object.isRequired,
  posterUrl: PropTypes.string,
  videoType: PropTypes.string.isRequired,
  sampleWindow: PropTypes.number.isRequired,
  samplePeriod: PropTypes.number.isRequired
};

export default Video;
