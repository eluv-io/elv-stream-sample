import React from "react";
import PropTypes from "prop-types";
//import HLSPlayer from "hls-fix";
import HLSPlayer from "hls.js";
import DashJS from "dashjs";
import Mux from "mux-embed";
import {inject, observer} from "mobx-react";
import {LoadingElement} from "elv-components-js";
import {InitializeFairPlayStream} from "../../FairPlay";

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
      qualityLevel: -1
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

    this.video = video;

    this.setState({qualityLevel: -1});

    video.volume = this.props.videoStore.volume;

    this.props.metricsStore.Reset();
    this.DestroyPlayer();

    const playoutOptions = this.props.videoStore.playoutOptions[this.props.videoStore.protocol].playoutMethods[this.props.videoStore.drm];

    // Media extensions API not supported - set up native HLS playback and skip monitoring
    if(
      this.props.videoStore.protocol === "hls" &&
      (!this.props.videoStore.hlsjsSupported || this.props.videoStore.drm === "sample-aes" || this.props.videoStore.drm === "fairplay")
    ) {
      if(this.props.videoStore.drm === "fairplay") {
        InitializeFairPlayStream({playoutOptions: this.props.videoStore.playoutOptions, video});
      }

      video.src = playoutOptions.playoutUrl;
      this.InitializeMuxMonitoring(video, playoutOptions.playoutUrl);

      return;
    }

    this.props.videoStore.protocol === "hls" ?
      this.InitializeHLS({video, playoutUrl: playoutOptions.playoutUrl, drms: playoutOptions.drms}) :
      this.InitializeDash({video, playoutUrl: playoutOptions.playoutUrl, drms: playoutOptions.drms});

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

  InitializeHLS({video, playoutUrl, drms}) {
    playoutUrl = new URL(playoutUrl);
    const authorizationToken = playoutUrl.searchParams.get("authorization");
    playoutUrl.searchParams.delete("authorization");
    playoutUrl = playoutUrl.toString();

    let drmSettings = {};
    if(["playready", "widevine"].includes(this.props.videoStore.drm)) {
      drmSettings = {
        drmSystems: {},
        emeEnabled: true,
        licenseXhrSetup: (xhr, url) => {
          xhr.open("POST", url, true);
          xhr.setRequestHeader("Authorization", `Bearer ${authorizationToken}`);
        }
      };

      if(this.props.videoStore.drm === "playready") {
        drmSettings.drmSystems = {
          "com.microsoft.playready": {
            licenseUrl: drms.playready.licenseServers[0]
          }
        };
      } else if (this.props.videoStore.drm === "widevine") {
        drmSettings.drmSystems = {
          "com.widevine.alpha": {
            licenseUrl: drms.widevine.licenseServers[0]
          }
        };
      }
    }

    const hlsOptions = this.props.videoStore.hlsjsOptions || {};
    this.player = new HLSPlayer({
      ...hlsOptions,
      ...drmSettings,
      xhrSetup: xhr => {
        xhr.setRequestHeader("Authorization", `Bearer ${authorizationToken}`);
        return xhr;
      },
    });

    this.bandwidthInterval = setInterval(
      () => this.props.videoStore.SetBandwidthEstimate(this.player.bandwidthEstimate),
      1000
    );

    this.player.loadSource(playoutUrl);
    this.player.attachMedia(video);

    this.player.on(HLSPlayer.Events.AUDIO_TRACK_SWITCHED, () => {
      const selectedTrackIndex = this.player.audioTrack;
      const tracks = Array.from(this.player.audioTracks).map(track => ({
        index: track.id,
        label:track.name || track.label || track.language || track.lang,
        active: track.id === selectedTrackIndex
      }));

      this.props.videoStore.SetAudioTracks({
        tracks,
        currentTrack: selectedTrackIndex
      });
    });

    this.player.on(HLSPlayer.Events.SUBTITLE_TRACKS_UPDATED, () => {
      this.props.videoStore.SetTextTracks({
        tracks: Array.from(this.video.textTracks),
        currentTrack: this.player.subtitleTrack
      });
    });

    this.player.on(HLSPlayer.Events.SUBTITLE_TRACK_LOADED, () => {
      this.props.videoStore.SetTextTracks({
        tracks: Array.from(this.video.textTracks),
        currentTrack: this.player.subtitleTrack
      });
    });

    this.player.on(HLSPlayer.Events.SUBTITLE_TRACK_SWITCH, () => {
      this.props.videoStore.SetTextTracks({
        currentTrack: this.player.subtitleTrack
      });
    });

    this.player.on(HLSPlayer.Events.LEVEL_SWITCHED, () =>
      this.props.videoStore.SetPlayerLevels({
        levels: this.player.levels.map((level, index) => ({resolution: level.attrs.RESOLUTION, bitrate: level.bitrate, qualityIndex: index})),
        currentLevel: this.player.currentLevel
      }));

    this.player.on(HLSPlayer.Events.FRAG_LOADED, (_, {frag}) => {
      try {
        if(frag.type !== "main" || frag.sn === "initSegment") { return; }

        const stats = frag.stats;
        const level = this.player.levels[frag.level];
        const bitrate = level.bitrate / 1000;
        const resolution = level.attrs.RESOLUTION;

        // Megabytes
        const size = stats.total / (1024 * 1024);

        // Seconds
        const latency = Math.max(1, stats.loading.first - stats.loading.start) / 1000;
        const downloadTime = Math.max(1, stats.loading.end - stats.loading.first) / 1000;

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

  InitializeDash({video, playoutUrl, drms}) {
    this.player = DashJS.MediaPlayer().create();

    this.player.updateSettings({
      streaming: {
        buffer: {
          fastSwitchEnabled: true
        },
        text: {
          defaultEnabled: false
        }
      }
    });

    playoutUrl = new URL(playoutUrl);
    const authorizationToken = playoutUrl.searchParams.get("authorization");
    playoutUrl.searchParams.delete("authorization");
    playoutUrl = playoutUrl.toString();

    this.player.extend("RequestModifier", function () {
      return {
        modifyRequestHeader: xhr => {
          xhr.setRequestHeader("Authorization", `Bearer ${authorizationToken}`);

          return xhr;
        },
        modifyRequestURL: url => url
      };
    });

    this.bandwidthInterval = setInterval(
      () => this.props.videoStore.SetBandwidthEstimate(this.player.getAverageThroughput("video") * 1000),
      1000
    );

    if(this.props.videoStore.drm === "widevine") {
      const widevineUrl = drms.widevine.licenseServers[0];

      this.player.setProtectionData({
        "com.widevine.alpha": {
          "serverURL": widevineUrl
        }
      });
    }

    const UpdateQualityOptions = () => {
      try {
        this.props.videoStore.SetPlayerLevels({
          levels: this.player.getBitrateInfoListFor("video")
            .map(level => ({
              resolution: `${level.width}x${level.height}`,
              bitrate: level.bitrate,
              qualityIndex: level.qualityIndex
            })),
          currentLevel: this.player.getQualityFor("video")
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("Failed to change quality", error);
      }
    };

    this.player.on(
      DashJS.MediaPlayer.events.CAN_PLAY,
      () => {
        UpdateQualityOptions();

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
      DashJS.MediaPlayer.events.QUALITY_CHANGE_RENDERED,
      () => {
        UpdateQualityOptions();
      }
    );

    this.player.on(DashJS.MediaPlayer.events.MANIFEST_LOADED, () => UpdateQualityOptions());

    this.player.on(
      DashJS.MediaPlayer.events.TEXT_TRACK_ADDED,
      () => {
        const activeTrackIndex = this.player.getCurrentTextTrackIndex();
        const tracks = this.player.getTracksFor("text").map((track, index) => ({
          index: index,
          label: track.labels && track.labels.length > 0 ? track.labels[0].text : track.lang,
          language: track.lang,
          active: index === activeTrackIndex
        }));

        this.props.videoStore.SetTextTracks({
          tracks,
          currentTrack: tracks[activeTrackIndex]
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

  async InitializeMuxMonitoring(video, playoutUrl) {
    const options = {
      debug: false,
      data: {
        env_key: "2i5480sms8vdgj0sv9bv6lpk5",
        video_id: this.props.videoStore.contentId,
        video_title: this.props.videoStore.title,
        video_cdn: playoutUrl ? new URL(playoutUrl).hostname : "",
        viewer_user_id: await this.props.videoStore.rootStore.client.CurrentAccountAddress()
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

  OfferingsAndChannels() {
    const offerings = this.props.videoStore.availableOfferings;
    const channels = this.props.videoStore.availableChannels;

    if(
      Object.keys(offerings || {}).length === 0 &&
      Object.keys(channels || {}).length === 0
    ) { return null; }

    return (
      <select
        value={this.props.videoStore.offering}
        className="video-playback-control"
        aria-label="Offerings and Channels"
        onChange={event => this.props.videoStore.SetOffering(event.target.value)}
      >
        {
          Object.keys(offerings).map(offeringKey =>
            <option
              value={offeringKey}
              key={`offering-${offeringKey}`}
            >
              Offering: { offerings[offeringKey].display_name || offeringKey }
            </option>
          )
        }
        {
          Object.keys(channels || {}).map(channelKey =>
            <option
              value={`channel--${channelKey}`}
              key={`channel-${channelKey}`}
            >
              Channel: { channels[channelKey].display_name || channelKey }
            </option>
          )
        }
      </select>
    );
  }

  Tracks() {
    if(this.props.videoStore.playerAudioTracks.length <= 1 && this.props.videoStore.playerTextTracks.length <= 0) {
      return null;
    }

    let SetAudioTrack, SetTextTrack;
    if(this.props.videoStore.protocol === "hls") {
      SetAudioTrack = event => {
        this.player.audioTrack = parseInt(event.target.value);
      };

      SetTextTrack = event => {
        const index = parseInt(event.target.value);

        this.player.subtitleTrack = index;

        this.props.videoStore.SetTextTracks({currentTrack: index});
      };
    } else {
      SetAudioTrack = event => {
        const index = parseInt(event.target.value);

        const track = this.player.getTracksFor("audio").find(track => track.index === index);

        this.player.setCurrentTrack(track);

        this.props.videoStore.SetAudioTracks({currentTrack: index});
      };

      SetTextTrack = event => {
        const index = parseInt(event.target.value);

        this.player.setTextTrack(index);
        this.props.videoStore.SetTextTracks({currentTrack: index});
      };
    }

    let textTrackSelection;
    if(this.props.videoStore.playerTextTracks.length > 0) {
      textTrackSelection = (
        <select
          aria-label="Subtitle Track"
          value={this.props.videoStore.playerCurrentTextTrack}
          className="video-playback-control"
          onChange={SetTextTrack}
        >
          <option value={-1}>Subtitles: None</option>
          {
            this.props.videoStore.playerTextTracks.map(track =>
              <option value={track.index} key={`audio-track-${track.index}`}>
                Subtitles: { track.label }
              </option>
            )
          }
        </select>
      );
    }

    let audioTrackSelection;
    if(this.props.videoStore.playerAudioTracks.length > 1) {
      audioTrackSelection = (
        <select
          aria-label="Audio Track"
          value={this.props.videoStore.playerCurrentAudioTrack}
          className="video-playback-control"
          onChange={SetAudioTrack}
        >
          {
            this.props.videoStore.playerAudioTracks.map(({index, label}) =>
              <option value={index} key={`audio-track-${index}`}>Audio: {label}</option>
            )
          }
        </select>
      );
    }

    return (
      <React.Fragment>
        { textTrackSelection }
        { audioTrackSelection }
      </React.Fragment>
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
        this.player.setQualityFor("video", parseInt(event.target.value), true);
        this.player.updateSettings({
          streaming: {
            buffer: {
              fastSwitchEnabled: true,
            },
            trackSwitchMode: {
              video: "alwaysReplace"
            },
            abr: {
              autoSwitchBitrate: {
                video: parseInt(event.target.value) === -1
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

    let autoLabel = "Auto";
    const currentLevel = this.props.videoStore.playerLevels?.find(level =>
      level.qualityIndex === this.props.videoStore.playerCurrentLevel
    );
    if(this.state.qualityLevel < 0 && currentLevel) {
      autoLabel = `Auto (${currentLevel.resolution})`;
    }

    // Add auto level
    levels.unshift(
      <option key="playback-level-auto" value={-1}>
        {autoLabel}
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
            key={`video-${this.props.videoStore.loadId}-${this.props.videoStore.contentId}-${this.props.videoStore.protocol}-${this.props.videoStore.drm}`}
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
            { this.OfferingsAndChannels() }
            { this.Tracks() }
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
