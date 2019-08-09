import React from "react";
import PropTypes from "prop-types";
import HLSPlayer from "../../node_modules/hls.js/dist/hls";
import DashJS from "dashjs";
import URI from "urijs";
import { VictoryLine, VictoryChart, VictoryTheme } from "victory";
import {CalculateHTTPMetrics} from "../Utils.js";

class LineGraph extends React.Component {
  constructor() {
    super();
    /* function bindings */
  }

  render(){
    return(
      <VictoryChart
        theme={VictoryTheme.material}
        maxDomain={{ y: this.props.max }}
        minDomain={{ y: 0 }}
        height={200}
        width={200}
      >

        <VictoryLine
          style={{
            data: { stroke: this.props.color },
            parent: { border: "1px solid #ccc"}
          }}
          data={this.props.data}
        />
      </VictoryChart>

    );
  }
}

class Video extends React.Component {
  constructor(props) {
    super(props);

    //set initial state here
    this.state = this.GetInitialState();

    this.metricsTimer = null;
    this.streamInfo;
    this.sessionStartTime = 0;
    this.maxPointsToChart = 30;

    this.InitializeVideo = this.InitializeVideo.bind(this);
    this.SetupDashCharts = this.SetupDashCharts.bind(this);
    this.UpdateMetrics = this.UpdateMetrics.bind(this);
    this.StopMetricsInterval = this.StopMetricsInterval.bind(this);
    this.GetTimeForPlot = this.GetTimeForPlot.bind(this);
  }

  GetInitialState(){
    const initialState = {
      //for handling video data
      chartsEnabled: false,
      bufferData: [],
      bitrateData: [],
      latencyData: [],

      buffer:         {color: "#00589d", label: "Video Buffer Level"},
      bitrate:        {color: "#ff7900", label: "Video Bitrate (kbps)"},
      latency:        {color: "#329d61", label: "Video Latency (ms)"},
    };
    return initialState;
  }

  InitializeVideo(video) {
    if(!video) { return; }

    let videoUrl = this.props.playoutOptions.playoutUrl;
    if(this.props.videoType === "hls") {
      videoUrl = URI(videoUrl).addSearch("player_profile", "hls-js").toString();

      const player = new HLSPlayer();
      player.loadSource(videoUrl);
      player.attachMedia(video);
      SetupHLSCharts(player);
    } else {
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

      player.initialize(video, videoUrl);
      this.sessionStartTime = new Date().getTime() / 1000;
      this.SetupDashCharts(player);
    }
  }

  /* to-do */
  componentWillUnmount(){
    //clear timeout
    this.StopMetricsInterval();
  }

  SetupDashCharts(player){
    /* preserve the this context */
    let component = this;

    player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, function(){
      component.StopMetricsInterval();
      // we set a timer for each second to update metrics
      component.metricsTimer = setInterval(function(){
        component.UpdateMetrics("video", player);
      }, 1000);

    });
    player.on(dashjs.MediaPlayer.events.PERIOD_SWITCH_COMPLETED, function (e) { /* jshint ignore:line */
      component.streamInfo = e.toStreamInfo;
    });
  }

  /* to-do */
  StopMetricsInterval() {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = null;
    }
  }

  GetTimeForPlot(){
    let now = new Date().getTime() / 1000;
    return Math.max(now - this.sessionStartTime, 0);
  }

  /* to-do */
  UpdateMetrics(type, player){
    let dashMetrics = player.getDashMetrics();
    let dashAdapter = player.getDashAdapter();

    let bufferLevel, bitrate, latency, repSwitch, periodIdx;

    if (dashMetrics && this.streamInfo) {
      periodIdx = this.streamInfo.index;
      repSwitch = dashMetrics.getCurrentRepresentationSwitch(type, true);
      bufferLevel = dashMetrics.getCurrentBufferLevel(type, true);
      bitrate = repSwitch ? Math.round(dashAdapter.getBandwidthForRepresentation(repSwitch.to, periodIdx) / 1000) : NaN;
    }

    let httpMetrics = CalculateHTTPMetrics(type, dashMetrics.getHttpRequests(type));
    //time isn't being used since we're updating every minute anyways
    // let time = this.GetTimeForPlot();

    latency = parseFloat(httpMetrics.latency[type].average.toFixed(2));

    this.setState(state => {
      const bufferData = state.bufferData.concat(bufferLevel);
      const latencyData = state.latencyData.concat(latency);
      const bitrateData = state.bitrateData.concat(bitrate);

      // const bufferData = state.bufferData.concat({x: time, y: bufferLevel});
      // const latencyData = state.latencyData.concat({x: time, y: latency});
      // const bitrateData = state.bitrateData.concat({x: time, y: bitrate});

      return {
        bufferData,
        latencyData,
        bitrateData
      };
    });
  }

  render() {

    // let el = "";
    //
    // if(this.state.chartsEnabled){

    let bufferData = this.state.bufferData;
    let latencyData = this.state.latencyData;
    let bitrateData = this.state.bitrateData;

    let bufferMax = Math.max(...bufferData)+5;
    let latencyMax = Math.max(...latencyData)+.05;
    let bitrateMax = Math.max(...bitrateData)+1000;

    const el = (
      <div>
        <React.Fragment>

          <LineGraph data = {bufferData} color = {this.state.buffer.color} max = {bufferMax}  />

        </React.Fragment>

        <React.Fragment>

          <LineGraph data = {latencyData} color = {this.state.latency.color} max = {latencyMax} />

        </React.Fragment>

        <React.Fragment>

          <LineGraph data = {bitrateData} color = {this.state.bitrate.color} max = {bitrateMax} />

        </React.Fragment>

      </div>
    );

    // }

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

        <div>{el}</div>

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

/* BEGINNING OF GRAPH UTILITIES */

function SetupHLSCharts(hls){

  let events;
  let stats;
  // let bufferingIdx;

  events = {
    t0     : performance.now(),
    load   : [],
    buffer : [],
    video  : [],
    level  : [],
    bitrate: []
  };

  hls.on(HLSPlayer.Events.MEDIA_ATTACHED, function(){
    // logStatus('Media element attached');
    // bufferingIdx = -1;
    events.video.push({
      time: performance.now() - events.t0,
      type: "Media attached"
    });
  });

  hls.on(HLSPlayer.Events.FRAG_PARSING_INIT_SEGMENT, function(event, data) {
    // showCanvas();
    let new_event = {
      time: performance.now() - events.t0,
      type: data.id + " init segment"
    };
    events.video.push(new_event);
    // trimEventHistory();
  });

  hls.on(HLSPlayer.Events.FRAG_BUFFERED, function(event, data) {
    let new_event = {
      type    : data.frag.type + " fragment",
      id      : data.frag.level,
      id2     : data.frag.sn,
      time    : data.stats.trequest - events.t0,
      latency : data.stats.tfirst - data.stats.trequest,
      load    : data.stats.tload - data.stats.tfirst,
      parsing : data.stats.tparsed - data.stats.tload,
      buffer  : data.stats.tbuffered - data.stats.tparsed,
      duration: data.stats.tbuffered - data.stats.tfirst,
      bw      : Math.round(8*data.stats.total/(data.stats.tbuffered - data.stats.trequest)),
      size    : data.stats.total
    };
    events.load.push(new_event);
    events.bitrate.push({
      time    : performance.now() - events.t0,
      bitrate : new_event.bw,
      duration: data.frag.duration,
      level   : event.id
    });

    if(hls.bufferTimer === undefined) {
      events.buffer.push({
        time  : 0,
        buffer: 0,
        pos   : 0
      });
      hls.bufferTimer = window.setInterval(checkBuffer, 100);
    }

    // trimEventHistory();
    // refreshCanvas();
    // updateLevelInfo();

    let latency = data.stats.tfirst - data.stats.trequest,
      parsing = data.stats.tparsed - data.stats.tload,
      process = data.stats.tbuffered - data.stats.trequest,
      bitrate = Math.round(8 * data.stats.length / (data.stats.tbuffered - data.stats.tfirst));
    if (stats.fragBuffered) {
      stats.fragMinLatency = Math.min(stats.fragMinLatency, latency);
      stats.fragMaxLatency = Math.max(stats.fragMaxLatency, latency);
      stats.fragMinProcess = Math.min(stats.fragMinProcess, process);
      stats.fragMaxProcess = Math.max(stats.fragMaxProcess, process);
      stats.fragMinKbps = Math.min(stats.fragMinKbps, bitrate);
      stats.fragMaxKbps = Math.max(stats.fragMaxKbps, bitrate);
      stats.autoLevelCappingMin = Math.min(stats.autoLevelCappingMin, hls.autoLevelCapping);
      stats.autoLevelCappingMax = Math.max(stats.autoLevelCappingMax, hls.autoLevelCapping);
      stats.fragBuffered++;
    } else {
      stats.fragMinLatency = stats.fragMaxLatency = latency;
      stats.fragMinProcess = stats.fragMaxProcess = process;
      stats.fragMinKbps = stats.fragMaxKbps = bitrate;
      stats.fragBuffered = 1;
      stats.fragBufferedBytes = 0;
      stats.autoLevelCappingMin = stats.autoLevelCappingMax = hls.autoLevelCapping;
      this.sumLatency = 0;
      this.sumKbps = 0;
      this.sumProcess = 0;
      this.sumParsing = 0;
    }
    stats.fraglastLatency = latency;
    this.sumLatency += latency;
    stats.fragAvgLatency = Math.round(this.sumLatency / stats.fragBuffered);
    stats.fragLastProcess = process;
    this.sumProcess += process;
    this.sumParsing += parsing;
    stats.fragAvgProcess = Math.round(this.sumProcess / stats.fragBuffered);
    stats.fragLastKbps = bitrate;
    this.sumKbps += bitrate;
    stats.fragAvgKbps = Math.round(this.sumKbps / stats.fragBuffered);
    stats.fragBufferedBytes += data.stats.total;
    stats.fragparsingKbps = Math.round(8*stats.fragBufferedBytes / this.sumParsing);
    stats.fragparsingMs = Math.round(this.sumParsing);
    stats.autoLevelCappingLast = hls.autoLevelCapping;
  });

  // console.log(events); 

}

export default Video;
