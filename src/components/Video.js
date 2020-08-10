import React from "react";
import PropTypes from "prop-types";
import HLSPlayer from "hls-fix";
import DashJS from "dashjs";
import URI from "urijs";
import Mux from "mux-embed";
import {inject, observer} from "mobx-react";
import {LoadingElement} from "elv-components-js";

@inject("rootStore")
@inject("videoStore")
@inject("metricsStore")
@observer
class Video extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      initialTime: undefined,
      video: undefined,
      videoVersion: 1,
      qualityLevel: -1,
      hlsOptions: JSON.stringify({
        maxBufferLength: 30,
        maxBufferSize: 300,
        enableWorker: true
      }, null, 2)
    };

    this.InitializeVideo = this.InitializeVideo.bind(this);
    this.StartSampling = this.StartSampling.bind(this);
    this.StopSampling = this.StopSampling.bind(this);
  }

  componentDidMount() {
    this.props.metricsStore.Reset();
  }

  componentWillUnmount(){
    this.StopSampling();
    this.DestroyPlayer();
  }

  DestroyPlayer() {
    this.StopSampling();

    if(this.bandwidthInterval) {
      clearInterval(this.bandwidthInterval);
      this.bandwidthInterval = undefined;
    }

    if(this.player) {
      this.player.destroy ? this.player.destroy() : this.player.reset();
    }
  }

  InitializeVideo(video) {
    if(!video || !this.props.videoStore.playoutOptions) { return; }

    this.setState({qualityLevel: -1});

    video.volume = this.props.videoStore.volume;

    this.props.metricsStore.Reset();
    this.DestroyPlayer();

    const playoutOptions = this.props.videoStore.playoutOptions[this.props.videoStore.protocol].playoutMethods[this.props.videoStore.drm];

    // Media extensions API not supported - set up native HLS playback and skip monitoring
    if(this.props.videoStore.protocol === "hls" && (!this.props.videoStore.hlsjsSupported || this.props.videoStore.drm === "sample-aes")) {
      video.src = playoutOptions.playoutUrl;
      this.InitializeMuxMonitoring(video, playoutOptions.playoutUrl);

      return;
    }

    this.props.videoStore.protocol === "hls" ?
      this.InitializeHLS(video, playoutOptions.playoutUrl) :
      this.InitializeDash(video, playoutOptions.playoutUrl, playoutOptions.drms);

    this.InitializeMuxMonitoring(video, playoutOptions.playoutUrl);

    this.setState({
      initialTime: performance.now(),
      video
    }, this.StartSampling);

    video.addEventListener("ended", () => {
      // Stop sampling when video has ended
      this.StopSampling();

      if(this.props.onMediaEnded) {
        this.props.onMediaEnded();
      }
    });

    window.player = this.player;
  }

  InitializeHLS(video, playoutUrl) {
    const options = JSON.parse(this.state.hlsOptions);
    this.player = new HLSPlayer(options);

    this.bandwidthInterval = setInterval(
      () => this.props.videoStore.SetBandwidthEstimate(this.player.bandwidthEstimate),
      1000
    );

    this.player.loadSource(playoutUrl);
    this.player.attachMedia(video);

    this.player.on(HLSPlayer.Events.AUDIO_TRACKS_UPDATED, () => {
      this.props.videoStore.SetAudioTracks({
        tracks: this.player.audioTrackController.tracks.map(audioTrack =>
          ({
            index: audioTrack.id,
            label: audioTrack.name
          })
        ),
        currentTrack: this.player.audioTrack
      });
    });

    this.player.on(HLSPlayer.Events.LEVEL_SWITCHED, () =>
      this.props.videoStore.SetPlayerLevels({
        levels: this.player.levels.map(level => ({resolution: level.attrs.RESOLUTION, bitrate: level.bitrate})),
        currentLevel: this.player.currentLevel
      }));

    this.player.on(HLSPlayer.Events.FRAG_LOADED, (_, {frag, stats}) => {
      try {
        if(frag.type !== "main" || frag.sn === "initSegment") { return; }

        const level = this.player.levels[frag.level];
        const bitrate = level.bitrate / 1000;
        const resolution = level.attrs.RESOLUTION;

        // Megabytes
        const size = stats.total / (1024 * 1024);

        // Seconds
        const latency = Math.max(1, stats.tfirst - stats.trequest) / 1000;
        const downloadTime = Math.max(1, stats.tload - stats.tfirst) / 1000;

        // Bits per second
        const downloadRate = (8 * stats.total) / downloadTime;
        const fullDownloadRate = (8 * stats.total) / (downloadTime + latency);

        this.props.metricsStore.LogSegment({
          id: frag.sn.toString(),
          quality: `${resolution} (${bitrate} Kbps)`,
          size,
          duration: frag.duration,
          latency,
          downloadTime,
          downloadRate,
          fullDownloadRate
        });
      } catch(error) {
        // eslint-disable-next-line no-console
        console.error("Error recording HLS segment stats:");
        // eslint-disable-next-line no-console
        console.error(error);
      }
    });
  }

  InitializeDash(video, playoutUrl, widevineOptions) {
    this.player = DashJS.MediaPlayer().create();

    this.bandwidthInterval = setInterval(
      () => this.props.videoStore.SetBandwidthEstimate(this.player.getAverageThroughput("video") * 1000),
      1000
    );

    if(this.props.videoStore.drm === "widevine") {
      const widevineUrl = widevineOptions.widevine.licenseServers[0];

      this.player.setProtectionData({
        "com.widevine.alpha": {
          "serverURL": widevineUrl
        }
      });
    }

    this.player.on(
      DashJS.MediaPlayer.events.CAN_PLAY,
      () => {
        // Subtitles are enabled by default - disable them
        this.player.setTextTrack(-1);

        this.props.videoStore.SetPlayerLevels({
          levels: this.player.getBitrateInfoListFor("video")
            .map(level => ({resolution: `${level.width}x${level.height}`, bitrate: level.bitrate, qualityIndex: level.qualityIndex})),
          currentLevel: 1
        });

        this.props.videoStore.SetAudioTracks({
          tracks: this.player.getTracksFor("audio").map(audioTrack =>
            ({
              index: audioTrack.index,
              label: audioTrack.labels && audioTrack.labels.length > 0 ? audioTrack.labels[0].text : audioTrack.lang
            })
          ),
          currentTrack: this.player.getCurrentTrackFor("audio").index
        });

        this.setState({
          audioTrack: this.player.getCurrentTrackFor("audio").index
        });
      }
    );

    this.player.on(
      DashJS.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED,
      ({request, response}) => {
        try {
          if(request.mediaType !== "video" || !request.index) { return; }

          const quality = this.player.getBitrateInfoListFor("video")[request.quality];
          const bitrate = quality.bitrate / 1000;
          const resolution = `${quality.width}x${quality.height}`;

          // Megabytes
          const size = response.byteLength / (1024 * 1024);

          // Seconds
          const latency = Math.max(1, request.firstByteDate - request.requestStartDate) / 1000;
          const downloadTime = Math.max(1, request.requestEndDate - request.firstByteDate) / 1000;

          // Bits per second
          const downloadRate = (8 * response.byteLength) / downloadTime;
          const fullDownloadRate = (8 * response.byteLength) / (downloadTime + latency);

          this.props.metricsStore.LogSegment({
            id: request.index.toString(),
            quality: `${resolution} (${bitrate} kbps)`,
            size,
            duration: request.duration,
            latency,
            downloadTime,
            downloadRate,
            fullDownloadRate
          });
        } catch(error) {
          // eslint-disable-next-line no-console
          console.error("Error recording dash segment stats:");
          // eslint-disable-next-line no-console
          console.error(error);
        }
      }
    );

    this.player.initialize(video, playoutUrl);
  }

  InitializeMuxMonitoring(video, playoutUrl) {
    const options = {
      debug: false,
      data: {
        env_key: "2i5480sms8vdgj0sv9bv6lpk5",
        video_id: this.props.videoStore.contentId,
        video_title: this.props.videoStore.title,
        video_cdn: URI(playoutUrl).hostname()
      }
    };

    if(this.player) {
      if (this.props.videoStore.protocol === "hls") {
        options.hlsjs = this.player;
        options.Hls = HLSPlayer;
        options.data.player_name = "stream-sample-hls";
      } else if (this.props.videoStore.protocol === "dash") {
        options.dashjs = this.player;
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
    const samplePeriod = this.props.metricsStore.samplePeriod * 1000;

    this.metricsInterval = setInterval(() => {
      // Determine buffer level relative to the current video time
      const buffer = this.state.video.buffered;
      const buffered = [...Array(buffer.length).keys()]
        .reduce((total, _, i) => total + (Math.max(0, buffer.end(i) - this.state.video.currentTime)), 0);

      const currentTime = (performance.now() - this.state.initialTime) / 1000;

      this.props.metricsStore.LogBuffer({currentTime, buffered});
    }, samplePeriod);
  }

  AudioTrack() {
    if(!this.props.videoStore.playerAudioTracks || this.props.videoStore.playerAudioTracks.length <= 1) {
      return null;
    }

    let SetAudioTrack;
    if(this.props.videoStore.protocol === "hls") {
      SetAudioTrack = (event) => {
        const index = parseInt(event.target.value);
        this.player.audioTrack = index;

        this.setState({audioTrack: index});
      };
    } else {
      SetAudioTrack = (event) => {
        const index = parseInt(event.target.value);

        const track = this.player.getTracksFor("audio").find(track => track.index === index);

        this.player.setCurrentTrack(track);

        this.setState({audioTrack: index});
      };
    }

    return (
      <select
        aria-label="Audio Track"
        value={this.state.audioTrack}
        className="video-playback-control"
        onChange={SetAudioTrack}
      >
        {
          this.props.videoStore.playerAudioTracks.map(({index, label}) =>
            <option value={index} key={`audio-track-${index}`}>{label}</option>
          )
        }
      </select>
    );
  }

  PlaybackLevel() {
    let SetLevel;
    if(this.props.videoStore.protocol === "hls") {
      SetLevel = event => {
        this.player.currentLevel = parseInt(event.target.value);
        this.state.video.currentTime = Math.max(this.state.video.currentTime - 0.1, 0);
        this.setState({
          qualityLevel: parseInt(event.target.value)
        });
      };
    } else {
      SetLevel = event => {
        // Set quality, disable or enable auto level, and seek a bit to make it reload segments
        this.player.setQualityFor("video", parseInt(event.target.value));
        this.player.updateSettings({
          streaming: {
            fastSwitchEnabled: true,
            abr: {
              autoSwitchBitrate: {
                video: true
              }
            }
          }
        });

        this.state.video.currentTime = Math.max(this.state.video.currentTime - 0.1, 0);
        this.setState({qualityLevel: event.target.value >= 0 ? this.player.getQualityFor("video") : -1});
      };
    }

    let levels = Object.keys(this.props.videoStore.playerLevels).map(levelIndex => {
      const level = this.props.videoStore.playerLevels[levelIndex];
      const value = typeof level.qualityIndex === "undefined" ? levelIndex : level.qualityIndex;

      return (
        <option key={`playback-level-${levelIndex}`} value={value}>
          {`${level.resolution} (${(level.bitrate / 1000 / 1000).toFixed(1)}Mbps)`}
        </option>
      );
    });

    // Add auto level
    levels.unshift(
      <option key="playback-level-auto" value={-1}>
        Auto
      </option>
    );

    return (
      <select
        aria-label="Playback Level"
        value={this.state.qualityLevel}
        onChange={SetLevel}
        className="video-playback-control"
      >
        { levels }
      </select>
    );
  }

  render() {
    return (
      <div className="video video-container" key={`video-version-${this.state.videoVersion}`}>
        <LoadingElement loadingClassname="video-loading" loading={this.props.videoStore.loading}>
          <video
            key={`video-${this.props.videoStore.contentId}-${this.props.videoStore.protocol}-${this.props.videoStore.drm}`}
            poster={this.props.videoStore.posterUrl}
            crossOrigin="anonymous"
            ref={this.InitializeVideo}
            autoPlay
            muted={this.props.videoStore.muted}
            onVolumeChange={this.props.videoStore.UpdateVolume}
            playsInline
            controls={!!this.props.videoStore.playoutOptions}
          />
          <div className="video-playback-controls">
            { this.AudioTrack() }
            { this.PlaybackLevel() }
          </div>
        </LoadingElement>
      </div>
    );
  }
}

Video.propTypes = {
  onMediaEnded: PropTypes.func
};

export default Video;
