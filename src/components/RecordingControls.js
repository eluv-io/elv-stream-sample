import React from "react";
import {inject, observer} from "mobx-react";
import {Action, Tabs, LoadingElement} from "elv-components-js";
import DateTimePicker from "react-datetime-picker";

@inject("root")
@inject("video")
@inject("recordings")
@observer
class RecordingControls extends React.Component {
  constructor(props) {
    super(props);

    const endTime = new Date();
    endTime.setHours(endTime.getHours() + 1);

    this.state = {
      manualRecording: false,
      recording: false,
      startTime: new Date(),
      endTime: endTime
    };
  }

  Recordings() {
    return (
      <React.Fragment>
        <h3>Recordings</h3>
        <div className="recordings-container">
          {this.props.recordings.recordings.map(recording => {
            return (
              <div className="recording-container" key={`recording-${recording.id}`}>
                <div className="recording-name">
                  {recording.versions[0].meta.name}
                </div>
                <Action
                  onClick={() => this.props.video.LoadVideo({versionHash: recording.versions[0].hash, protocol: "hls"})}>
                  Play Recording
                </Action>
              </div>
            );
          })}
        </div>
      </React.Fragment>
    );
  }

  RecordingType() {
    const options = [["Scheduled", false], ["Manual", true]];

    return (
      <Tabs
        options={options}
        selected={this.state.manualRecording}
        onChange={value => this.setState({manualRecording: value})}
        className="secondary"
      />
    );
  }

  ManualRecording() {
    return (
      <Action
        className={`record-action ${this.state.recording ? "recording" : ""}`}
        onClick={() => this.setState({recording: !this.state.recording})}
      >
        { this.state.recording ? "Stop Recording" : "Start Recording"}
      </Action>
    );
  }

  ScheduledRecording() {
    return (
      <div className="scheduled-recording-container">
        <div className="recording-times">
          <DateTimePicker
            format="y-MM-dd h:mm:ss a"
            value={this.state.startTime}
            onChange={value => this.setState({startTime: value})}
            className="recording-time recording-start-time"
          />
          <DateTimePicker
            format="y-MM-dd h:mm:ss a"
            value={this.state.endTime}
            onChange={value => this.setState({endTime: value})}
            className="recording-time recording-end-time"
          />
        </div>
        <Action
          className="record-button"
          onClick={() => this.props.recordings.ScheduleRecording({
            startTime: this.state.startTime,
            endTime: this.state.endTime
          })}
        >
          Schedule Recording
        </Action>
      </div>
    );
  }

  Controls() {
    return (
      <LoadingElement loading={this.props.recordings.loading}>
        <div className="recording-options">
          { this.state.manualRecording ? this.ManualRecording() : this.ScheduledRecording() }
        </div>
      </LoadingElement>
    );
  }

  render() {
    if(this.props.root.balance < 1 || this.props.video.loading || this.props.video.videoType !== "live") { return null; }

    return (
      <div className="recording-controls-container">
        <h3>Stream Recording</h3>
        { this.Controls() }
        { this.Recordings() }
      </div>
    );
  }
}

export default RecordingControls;
