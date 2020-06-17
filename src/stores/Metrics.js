import {observable, action} from "mobx";

class MetricsStore {
  @observable bufferData = [];
  @observable segmentData = [];
  @observable sampleWindow = 30;
  @observable samplePeriod = 0.5;
  @observable initialTime;

  constructor(rootStore) {
    this.rootStore = rootStore;
  }

  @action.bound
  Reset() {
    this.bufferData = [];
    this.segmentData = [];
  }

  @action.bound
  SetSampleWindow(sampleWindow) {
    this.sampleWindow = sampleWindow;
  }

  @action.bound
  LogSegment({id, quality, size, duration, latency, downloadTime, downloadRate, fullDownloadRate}) {
    this.segmentData = [
      { id, quality, size, duration, latency, downloadTime, downloadRate, fullDownloadRate },
      ...this.segmentData
    ].slice(0, 100);
  }

  @action.bound
  LogBuffer({currentTime, buffered}) {
    this.bufferData = [
      ...this.bufferData,
      { x: currentTime, y: buffered }
    ];

    this.TrimSamples();
  }

  // Discard old samples that are no longer visible
  @action
  TrimSamples() {
    if(this.bufferData.length === 0) { return; }

    const maxSamples = this.sampleWindow * (1 / this.samplePeriod) * 1.25;

    // Trim after threshold is reached to avoid trimming after every sample
    const trimThreshold = maxSamples * 1.25;

    if(this.bufferData.length < trimThreshold) { return; }

    this.bufferData = this.bufferData.slice(-maxSamples);
  }
}

export default MetricsStore;
