import React from "react";
import PropTypes from "prop-types";
import HLSPlayer from "../../node_modules/hls.js/dist/hls";
import DashJS from "dashjs";
import URI from "urijs";
import { VictoryLine, VictoryChart,VictoryAxis, VictoryTheme, VictoryScatter, VictoryLegend, VictoryLabel } from "victory";
import {CalculateHTTPMetrics} from "../Utils.js";

class LineGraph extends React.Component {
  constructor() {
    super();

    this.state = {
      chartWidth: 0,
      axisFontSize: 10,
      /* to-do add other specifics for styling */
      // lineSize: 5,
    };
  }

  componentDidMount() {
    this.setState({
      chartWidth: window.innerWidth
    });
    window.addEventListener("resize", this.updateDimensions.bind(this));
  }

  /* clear event listener */
  componentWillUnmount(){
    window.removeEventListener("resize", this.updateDimensions.bind(this));
  }

  updateDimensions(event) {
    // let size = "4vw";
    let size = "8px";
    this.setState({
      chartWidth: event.target.innerWidth,
      axisFontSize: size,
    });
  }

  render(){

    return(

      <svg viewBox={"0 0" + " "+ this.state.chartWidth +" " + "350"}  preserveAspectRatio="none" width="100%">

        <VictoryChart
          theme={VictoryTheme.material}
          maxDomain={{ y: this.props.max }}
          minDomain={{ y: 0 }}
          standalone={false}
          width={this.state.chartWidth}
          height={350}
        >

          <VictoryLegend
            height={100}
            width={100}
            centerTitle
            style={{title: {fontSize: 8 } }}
            colorScale = {[this.props.color]}
            data={[
              {name: this.props.name, symbol: { type: "square"}},
            ]}
          />

          <VictoryAxis
            // tickValues specifies both the number of ticks and where
            // they are placed on the axis
            label="Time (s)"
            axisLabelComponent={<VictoryLabel dy={20}/>}

            style={{tickLabels: { fill: "#ceded7", fontSize: this.state.axisFontSize }}}
          />
          <VictoryAxis
            dependentAxis
            // tickFormat specifies how ticks should be displayed
            style={{tickLabels: { fill: "#ceded7", fontSize: this.state.axisFontSize }}}
          />

          <VictoryLine
            style={{
              data: { stroke: this.props.color, strokeWidth: 1 },
            }}
            data={this.props.data}
          />

          <VictoryScatter data={this.props.data}
            size={.75}
            style={{ data: { fill: this.props.color } }}
          />
        </VictoryChart>

      </svg>

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
    this.SetupHLSCharts = this.SetupHLSCharts.bind(this);
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
      this.setState({chartsEnabled: true});
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
      this.setState({chartsEnabled: true});
    }
  }

  /* re-set timer */
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

  SetupHLSCharts(hls){

    let events = {
      t0: performance.now(),
      bitrate: [],
      latency: [],
      bufferLevel: [],
      time: 0,
    };

    let currentBitrate = 0, currentLatency = 0, currentBufferLevel = 0;

    hls.on(HLSPlayer.Events.FRAG_BUFFERED, function(event, data) {

      /* preferred approach is to trim array depending on time */

      // data.stats.total -> number of bytes processed, and bitrate is the amount of time it took to process that request
      events.bitrate.push({
        bitrate: Math.round(8*data.stats.total/(data.stats.tbuffered - data.stats.trequest)),
        time: performance.now() - events.t0,
      });

      events.latency.push({
        latency: (data.stats.tfirst - data.stats.trequest)/1000,
        time: performance.now() - events.t0,
      });

      /* don't think this calculates the correct buffer */
      events.bufferLevel.push({
        bufferLevel : data.stats.tbuffered - data.stats.tparsed,
        time: performance.now() - events.t0,
      });
    });

    /* TO-DO: check other event listeners that could affect metrics */

    // hls.on(HLSPlayer.Events.LEVEL_SWITCHING, function(event, data) {
    // events.level.push({
    //   time   : performance.now() - events.t0,
    //   id     : data.level,
    //   bitrate: Math.round(hls.levels[data.level].bitrate/1000)
    // });
    // trimEventHistory();
    // updateLevelInfo();
    // });

    /* every second, get the averages of the data in that timeframe */

    this.StopMetricsInterval();

    let prevTimeInterval = 0;
    let component = this;

    this.metricsTimer = setInterval(function(){
      let time = performance.now() - events.t0;
      let bitCount = 0, latCount = 0, bufCount = 0;

      events.bitrate.forEach(function(element){
        if((element.time <= time) && (element.time>prevTimeInterval)){
          currentBitrate += element.bitrate;
          bitCount++;
        }else{
          bitCount = 1;
        }
      });

      events.latency.forEach(function(element){
        if((element.time <= time) && (element.time>prevTimeInterval)){
          currentLatency += element.latency;
          latCount++;
        }else{
          latCount = 1;
        }
      });

      events.bufferLevel.forEach(function(element){
        if((element.time <= time) && (element.time>prevTimeInterval)){
          currentBufferLevel += element.bufferLevel;
          bufCount++;
        }else{
          bufCount = 1;
        }
      });

      currentBitrate = currentBitrate/bitCount;
      currentBufferLevel = currentBufferLevel/bufCount;
      currentLatency = currentLatency/latCount;
      prevTimeInterval = time;

      component.setState(state => {
        const bufferData = state.bufferData.concat(currentBufferLevel);
        const latencyData = state.latencyData.concat(currentLatency);
        const bitrateData = state.bitrateData.concat(currentBitrate);

        return {
          bufferData,
          latencyData,
          bitrateData
        };
      });

      currentBitrate = 0, currentLatency = 0, currentBufferLevel = 0;
    }, 1000);

  }

  /* on restart */
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

  /* updates Dash metrics */
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
    //time isn't being used since we're updating every 1 second anyways
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

    let el = null;
    if(this.state.chartsEnabled){

      let bufferData = this.state.bufferData;
      let latencyData = this.state.latencyData;
      let bitrateData = this.state.bitrateData;

      let bufferMax = Math.max(...bufferData)+5;
      let latencyMax = Math.max(...latencyData)+.05;
      let bitrateMax = Math.max(...bitrateData)+1000;

      el = (
        <div>

          <LineGraph data = {bufferData} color = {this.state.buffer.color} max = {bufferMax} name = {this.state.buffer.label}  />

          <LineGraph data = {latencyData} color = {this.state.latency.color} max = {latencyMax} name = {this.state.latency.label} />

          <LineGraph data = {bitrateData} color = {this.state.bitrate.color} max = {bitrateMax} name = {this.state.bitrate.label} />

        </div>
      );

    }

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

export default Video;
