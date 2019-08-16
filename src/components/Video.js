import React from "react";
import PropTypes from "prop-types";
import HLSPlayer from "../../node_modules/hls.js/dist/hls";
import {BufferHelper} from "../../node_modules/hls.js/src/utils/buffer-helper";
import DashJS from "dashjs";
import URI from "urijs";
import Graph from "./Graph";
import Segments from "./Segments";
import Mux from "mux-embed";

class Video extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      bufferData: [],
      segmentData: [],
      initialTime: undefined,
      player: undefined,
      video: undefined
    };

    this.InitializeVideo = this.InitializeVideo.bind(this);
    this.StartSampling = this.StartSampling.bind(this);
    this.StopSampling = this.StopSampling.bind(this);
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

    const player = this.props.protocol === "hls" ?
      this.InitializeHLS(video, playoutUrl) :
      this.InitializeDash(video, playoutUrl);

    this.InitializeMux(player);

    this.setState({
      initialTime: performance.now(),
      player,
      video
    }, this.StartSampling);

    // Stop sampling when video has ended
    video.addEventListener("ended", this.StopSampling);
  }

  InitializeHLS(video, playoutUrl) {
    playoutUrl = URI(playoutUrl).addSearch("player_profile", "hls-js").toString();

    const player = new HLSPlayer();

    player.loadSource(playoutUrl);
    player.attachMedia(video);

    player.on(HLSPlayer.Events.FRAG_LOADED, (_, {frag, stats}) => {
      if(frag.type !== "main" || frag.sn === "initSegment") { return; }

      const level = player.levels[frag.level];
      const bitrate = level.bitrate / 1000;
      const resolution = level.attrs.RESOLUTION;

      // Megabytes
      const size = stats.total / (1024 * 1024);

      // Milliseconds
      const latency = stats.tfirst - stats.trequest;
      const downloadTime = stats.tload - stats.tfirst;

      // Megabits per second
      const downloadRate = (8 * stats.total) / (downloadTime / 1000) / 1000000;

      const segmentData = {
        id: frag.sn.toString(),
        quality: `${resolution} (${bitrate} Kbps)`,
        size,
        duration: frag.duration,
        latency,
        downloadTime,
        downloadRate
      };

      this.setState({
        segmentData: [segmentData, ...this.state.segmentData]
      });
    });

    return player;
  }

  InitializeDash(video, playoutUrl) {
    const player = DashJS.MediaPlayer().create();

    if(this.props.drm === "widevine") {
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

    player.on(
      DashJS.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED,
      ({request, response}) => {
        if(request.mediaType !== "video" || !request.index) { return; }

        const quality = player.getBitrateInfoListFor("video")[request.quality];
        const bitrate = quality.bitrate / 1000;
        const resolution = `${quality.width}x${quality.height}`;

        // Megabytes
        const size = response.byteLength / (1024 * 1024);

        // Milliseconds
        const latency = request.firstByteDate - request.requestStartDate;
        const downloadTime = request.requestEndDate - request.firstByteDate;

        // Megabits per second
        const downloadRate = (8 * response.byteLength) / (downloadTime / 1000) / 1000000;

        const segmentData = {
          id: request.index.toString(),
          quality: `${resolution} (${bitrate} kbps)`,
          size,
          duration: request.duration,
          latency,
          downloadTime,
          downloadRate
        };

        this.setState({
          segmentData: [segmentData, ...this.state.segmentData]
        });
      }
    );

    player.initialize(video, playoutUrl);

    return player;
  }

  InitializeMux(player) {
    const options = {
      debug: false,
      data: {
        env_key: "2i5480sms8vdgj0sv9bv6lpk5",
        video_id: this.props.versionHash,
        video_title: this.props.metadata.name
      }
    };

    if(this.props.protocol === "hls") {
      options.hlsjs = player;
      options.Hls = HLSPlayer;
      options.data.player_name = "stream-sample-hls";
    } else {
      options.dashjs = player;
      options.data.player_name = "stream-sample-dash";
    }

    Mux.monitor("video", options);
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
  }

  StopSampling() {
    clearInterval(this.metricsInterval);
    this.metricsInterval = undefined;
  }

  StartSampling() {
    if(this.props.protocol === "hls") {
      this.metricsInterval = setInterval(() => {
        const currentTime = (performance.now() - this.state.initialTime) / 1000;
        const stats = this.state.player.streamController.stats;

        if(!stats) { return; }

        const bufferInfo = BufferHelper.bufferInfo(this.state.video, this.state.video.currentTime, 0);

        if(bufferInfo.end >= this.state.video.duration) {
          // Buffering finished
          return;
        }

        this.setState({
          bufferData: this.state.bufferData.concat({
            x: currentTime,
            y: (bufferInfo.len) || 0
          })
        });

        this.TrimSamples();
      }, this.props.samplePeriod);
    } else {
      this.metricsInterval = setInterval(() => {
        const currentTime = (performance.now() - this.state.initialTime) / 1000;
        const dashMetrics = this.state.player.getDashMetrics();
        const bufferLevel = dashMetrics.getCurrentBufferLevel("video", true);

        if(Math.abs(bufferLevel - (this.state.video.duration - this.state.video.currentTime)) < 1) {
          // Buffering finished
          return;
        }

        this.setState({
          bufferData: this.state.bufferData.concat({
            x: currentTime,
            y: bufferLevel,
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
        <div className="metrics-container">
          <Graph
            name="Buffer Level (s)"
            data={this.state.bufferData}
            color={"#00589d"}
            windowSize={this.props.sampleWindow}
          />
          <Segments
            segmentData={this.state.segmentData}
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
  protocol: PropTypes.string.isRequired,
  sampleWindow: PropTypes.number.isRequired,
  samplePeriod: PropTypes.number.isRequired,
  versionHash: PropTypes.string.isRequired
};

export default Video;
