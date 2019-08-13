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
      bitrateData: [],
      latencyData: [],
      graphWindowSize: 20,
      sampleInterval: 250
    };

    this.metricsInterval = null;

    this.InitializeVideo = this.InitializeVideo.bind(this);
  }

  componentWillUnmount(){
    clearInterval(this.metricsInterval);
    this.metricsInterval = undefined;
  }

  InitializeVideo(video) {
    if(!video) { return; }

    let playoutUrl = this.props.playoutOptions.playoutUrl;
    if(this.props.videoType === "hls") {
      this.InitializeHLS(video, playoutUrl);
    } else {
      this.InitializeDash(video, playoutUrl);
    }
  }

  InitializeHLS(video, playoutUrl) {
    playoutUrl = URI(playoutUrl).addSearch("player_profile", "hls-js").toString();

    const player = new HLSPlayer();
    const initialTime = performance.now();

    player.loadSource(playoutUrl);
    player.attachMedia(video);

    this.metricsInterval = setInterval(() => {
      const currentTime = (performance.now() - initialTime) / 1000;
      const stats = player.streamController.stats;

      if(!stats) { return; }

      const bufferInfo = BufferHelper.bufferInfo(video, video.currentTime, 0);

      this.setState({
        bitrateData: this.state.bitrateData.concat({
          x: currentTime,
          y: (Math.round((8 * stats.total) / (stats.tbuffered - stats.trequest)) / 10) || 0
        }),
        latencyData: this.state.latencyData.concat({
          x: currentTime,
          y: (stats.tfirst - stats.trequest) / 1000
        }),
        bufferData: this.state.bufferData.concat({
          x: currentTime,
          y: (bufferInfo.len) || 0
        })
      });
    }, this.state.sampleInterval);
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

    const initialTime = performance.now();

    this.metricsInterval = setInterval(() => {
      let dashMetrics = player.getDashMetrics();
      let dashAdapter = player.getDashAdapter();

      let bufferLevel, bitrate, repSwitch, periodIdx;

      if(dashMetrics && this.streamInfo) {
        periodIdx = this.streamInfo.index;
        repSwitch = dashMetrics.getCurrentRepresentationSwitch("video", true);
        bufferLevel = dashMetrics.getCurrentBufferLevel("video", true);
        bitrate = repSwitch ? Math.round(dashAdapter.getBandwidthForRepresentation(repSwitch.to, periodIdx) / 1000) : 0;
      }

      const requests = dashMetrics.getHttpRequests("video");
      const requestWindow =
        requests
          .slice(-20)
          .filter(req =>
            req.responsecode >= 200 &&
            req.responsecode < 300 &&
            req.type === "MediaSegment" &&
            req._stream === "video" &&
            !!req._mediaduration
          )
          .slice(-2);

      let latency = 0;
      if(requestWindow.length > 0) {
        const latencyTimes = requestWindow.map(req =>
          Math.abs(req.tresponse.getTime() - req.trequest.getTime()) / 1000
        );

        latency = latencyTimes.reduce((l, r) => l + r) / latencyTimes.length;
      }

      const currentTime = (performance.now() - initialTime) / 1000;

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
          y: bitrate
        })
      });
    }, this.state.sampleInterval);

    player.on(DashJS.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, (e) => {
      this.streamInfo = e.toStreamInfo;
    });

    player.initialize(video, playoutUrl);
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
            windowSize={this.state.graphWindowSize}
          />
          <Graph
            name="Latency (ms)"
            data={this.state.latencyData}
            color={"#329d61"}
            windowSize={this.state.graphWindowSize}
          />
          <Graph
            name="Bitrate (kbps)"
            data={this.state.bitrateData}
            color={"#ff7900"}
            windowSize={this.state.graphWindowSize}
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
};

export default Video;
