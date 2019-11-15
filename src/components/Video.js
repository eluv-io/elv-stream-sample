import React from "react";
import PropTypes from "prop-types";
import HLSPlayer from "../../node_modules/hls.js/dist/hls";
import DashJS from "dashjs";
import URI from "urijs";
import Mux from "mux-embed";
import {inject, observer} from "mobx-react";

@inject("video")
@inject("metrics")
@observer
class Video extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      initialTime: undefined,
      player: undefined,
      video: undefined
    };

    this.InitializeVideo = this.InitializeVideo.bind(this);
    this.StartSampling = this.StartSampling.bind(this);
    this.StopSampling = this.StopSampling.bind(this);
  }

  componentDidMount() {
    this.props.metrics.Reset();
  }

  componentWillUnmount(){
    this.StopSampling();

    if(this.state.player) {
      this.state.player.destroy ? this.state.player.destroy() : this.state.player.reset();
    }
  }

  InitializeVideo(video) {
    if(!video) { return; }

    const playoutOptions = this.props.video.playoutOptions[this.props.video.protocol].playoutMethods[this.props.video.drm];

    // Media extensions API not supported - set up native HLS playback and skip monitoring
    if(!this.props.video.hlsjsSupported) {
      video.src = playoutOptions.playoutUrl;
      this.InitializeMuxMonitoring(video, undefined, playoutOptions.playoutUrl);

      return;
    }

    const player = this.props.video.protocol === "hls" ?
      this.InitializeHLS(video, playoutOptions.playoutUrl) :
      this.InitializeDash(video, playoutOptions.playoutUrl, playoutOptions.drms.widevine);

    this.InitializeMuxMonitoring(video, player, playoutOptions.playoutUrl);

    this.setState({
      initialTime: performance.now(),
      player,
      video
    }, this.StartSampling);

    video.addEventListener("ended", () => {
      // Stop sampling when video has ended
      this.StopSampling();

      if(this.props.onMediaEnded) {
        this.props.onMediaEnded();
      }
    });
  }

  InitializeHLS(video, playoutUrl) {
    const player = new HLSPlayer({
      nudgeOffset: 0.2,
      nudgeMaxRetry: 30,
    });

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

      this.props.metrics.LogSegment({
        id: frag.sn.toString(),
        quality: `${resolution} (${bitrate} Kbps)`,
        size,
        duration: frag.duration,
        latency,
        downloadTime,
        downloadRate
      });
    });

    return player;
  }

  InitializeDash(video, playoutUrl, widevineOptions) {
    const player = DashJS.MediaPlayer().create();

    if(this.props.video.drm === "widevine") {
      const widevineUrl = widevineOptions.licenseServers[0];

      player.setProtectionData({
        "com.widevine.alpha": {
          "serverURL": widevineUrl,
          "httpRequestHeaders": {
            "Authorization": `Bearer ${this.props.video.authToken}`
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

        this.props.metrics.LogSegment({
          id: request.index.toString(),
          quality: `${resolution} (${bitrate} kbps)`,
          size,
          duration: request.duration,
          latency,
          downloadTime,
          downloadRate
        });
      }
    );

    player.initialize(video, playoutUrl);

    return player;
  }

  InitializeMuxMonitoring(video, player, playoutUrl) {
    const options = {
      debug: false,
      data: {
        env_key: "2i5480sms8vdgj0sv9bv6lpk5",
        video_id: this.props.video.contentId,
        video_title: this.props.video.metadata.name,
        video_cdn: URI(playoutUrl).hostname()
      }
    };

    if(player) {
      if (this.props.video.protocol === "hls") {
        options.hlsjs = player;
        options.Hls = HLSPlayer;
        options.data.player_name = "stream-sample-hls";
      } else if (this.props.video.protocol === "dash") {
        options.dashjs = player;
        options.data.player_name = "stream-sample-dash";
      }
    }

    try {
      Mux.monitor(video, options);
    } catch(error) {
      // eslint-disable-next-line no-console
      console.error("Failed to initialize mux monitoring:");
      // eslint-disable-next-line no-console
      console.error(error);
    }
  }

  StopSampling() {
    clearInterval(this.metricsInterval);
    this.metricsInterval = undefined;
  }

  StartSampling() {
    const samplePeriod = 250;

    this.metricsInterval = setInterval(() => {
      //this.TrimSamples();

      // Determine buffer level relative to the current video time
      const buffer = this.state.video.buffered;
      const buffered = [...Array(buffer.length).keys()]
        .reduce((total, _, i) => total + (Math.max(0, buffer.end(i) - this.state.video.currentTime)), 0);

      const currentTime = (performance.now() - this.state.initialTime) / 1000;

      this.props.metrics.LogBuffer({currentTime, buffered});
    }, samplePeriod);
  }

  Header() {
    const selectedOption = this.props.video.availableContent
      .find(content => content.versionHash === this.props.video.contentId);

    if(selectedOption) {
      if(selectedOption.subHeader) {
        return (
          <div className="header-with-subheader">
            <h1>{selectedOption.header}</h1>
            <h3>{selectedOption.subHeader}</h3>
          </div>
        );
      } else {
        return <h1>{selectedOption.header}</h1>;
      }
    } else {
      return <h1>{this.props.video.metadata.name}</h1>;
    }
  }

  render() {
    return (
      <div className="video-container">
        { this.Header() }
        <video
          poster={this.props.video.posterUrl}
          crossOrigin="anonymous"
          ref={this.InitializeVideo}
          playsInline
          controls
        />
      </div>
    );
  }
}

Video.propTypes = {
  onMediaEnded: PropTypes.func
};

export default Video;
