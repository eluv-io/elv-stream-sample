import {observable, action} from "mobx";

class MetricsStore {
  @observable bufferData = [];
  @observable segmentData = [];
  @observable sampleWindow = 20;
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
  LogSegment({id, quality, size, duration, latency, downloadTime, downloadRate}) {
    this.segmentData = [
      { id, quality, size, duration, latency, downloadTime, downloadRate },
      ...this.segmentData
    ];
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

    // Max visible samples is 300 seconds times 4 samples per second
    const maxSamples = 300 * 4;

    // Trim after threshold is reached to avoid trimming after every sample
    const trimThreshold = maxSamples * 1.1;

    // Earliest visible time is 300 seconds ago
    const minVisibleTime = performance.now() - (300 * 1000);

    const trim = data => data.slice(-maxSamples).filter(({x}) => x > minVisibleTime);

    if(this.bufferData.length > trimThreshold) {
      this.bufferData = trim(this.bufferData);
    }
  }
}

export default MetricsStore;
