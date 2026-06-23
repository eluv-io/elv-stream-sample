import { create } from "zustand";

export interface BufferPoint {
  x: number;
  y: number;
}

export interface SegmentMetric {
  id: string;
  quality: string;
  size: number;
  duration: number;
  latency: number;
  downloadTime: number;
  downloadRate: number;
  fullDownloadRate: number;
}

interface MetricsState {
  bufferData: BufferPoint[];
  segmentData: SegmentMetric[];
  sampleWindow: number;
  samplePeriod: number;
  reset: () => void;
  setSampleWindow: (sampleWindow: number) => void;
  logSegment: (segment: SegmentMetric) => void;
  logBuffer: (point: BufferPoint) => void;
}

export const useMetricsStore = create<MetricsState>((set) => ({
  bufferData: [],
  segmentData: [],
  sampleWindow: 30,
  samplePeriod: 0.5,

  reset: () => set({ bufferData: [], segmentData: [] }),

  setSampleWindow: (sampleWindow) => set({ sampleWindow }),

  logSegment: (segment) =>
    set((state) => ({
      segmentData: [segment, ...state.segmentData].slice(0, 100),
    })),

  logBuffer: ({ x, y }) => {
    set((state) => {
      const bufferData = [...state.bufferData, { x, y }];
      const maxSamples = state.sampleWindow * (1 / state.samplePeriod) * 1.25;
      const trimThreshold = maxSamples * 1.25;

      if (bufferData.length >= trimThreshold) {
        return { bufferData: bufferData.slice(-maxSamples) };
      }

      return { bufferData };
    });
  },
}));
