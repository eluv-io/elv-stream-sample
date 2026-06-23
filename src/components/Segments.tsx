import PrettyBytes from "pretty-bytes";
import { useEffect, useState } from "react";

import { useMetricsStore } from "@/stores/useMetricsStore";
import { useRootStore } from "@/stores/useRootStore";
import { useVideoStore } from "@/stores/useVideoStore";

export function Segments() {
  const playoutOptions = useVideoStore((state) => state.playoutOptions);
  const metricsSupported = useVideoStore((state) => state.metricsSupported());
  const bandwidthEstimate = useVideoStore((state) => state.bandwidthEstimate);
  const segmentData = useMetricsStore((state) => state.segmentData);
  const devMode = useRootStore((state) => state.devMode);
  const [timingScale, setTimingScale] = useState(2000);

  useEffect(() => {
    const maxTime = Math.max(
      ...segmentData.map((segment) => segment.duration * 1000),
      ...segmentData.map((segment) => (segment.latency + segment.downloadTime) * 1000),
      2000,
    );

    setTimingScale(maxTime);
  }, [segmentData]);

  if (!playoutOptions || !metricsSupported) {
    return null;
  }

  return (
    <div className="border-t p-4">
      <h3 className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-foreground">
        <span>Segment Metrics</span>
        {devMode ? (
          <span className="font-normal">
            Player Bandwidth Estimate:
            <span className="ml-2 font-medium text-foreground">
              {PrettyBytes(bandwidthEstimate || 0, { bits: true })}/s
            </span>
          </span>
        ) : null}
      </h3>

      <div className="overflow-x-auto rounded-lg border">
        <div className="grid min-w-[900px] grid-cols-6 gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div>ID</div>
          <div>Quality</div>
          <div>Size</div>
          <div>Download Rate</div>
          <div>Throughput</div>
          <div>Timing (ms)</div>
        </div>
        <div className="max-h-[25rem] overflow-y-auto">
          {segmentData.map((segment, index) => {
            const latency = segment.latency * 1000;
            const downloadTime = segment.downloadTime * 1000;
            const duration = Math.round(segment.duration) * 1000;
            const durationWidth = (duration / timingScale) * 100;
            const latencyWidth = (latency / timingScale) * 100;
            const downloadWidth = (downloadTime / timingScale) * 100;

            return (
              <div
                key={`segment-${segment.id}-${index}`}
                className={`grid h-10 min-w-[900px] grid-cols-6 items-center gap-2 border-b px-3 text-sm last:border-b-0 ${
                  parseInt(segment.id, 10) % 2 === 0 ? "bg-muted/20" : ""
                }`}
              >
                <div className="truncate">{segment.id}</div>
                <div className="truncate">{segment.quality}</div>
                <div className="truncate">{`${segment.size.toFixed(2)} MB`}</div>
                <div className="truncate">{`${PrettyBytes(segment.downloadRate, { bits: true })}/s`}</div>
                <div className="truncate">{`${PrettyBytes(segment.fullDownloadRate, { bits: true })}/s`}</div>
                <div>
                  <div className="flex h-6 overflow-hidden rounded text-[10px] text-foreground/80">
                    <span
                      className="segment-duration inline-flex items-center justify-center overflow-hidden px-1"
                      style={{ width: `${durationWidth}%` }}
                      title={`Segment duration: ${duration.toFixed(0)}`}
                    >
                      {duration.toFixed(0)}
                    </span>
                    <span
                      className="segment-latency inline-flex items-center justify-center overflow-hidden px-1"
                      style={{ width: `${latencyWidth}%` }}
                      title={`Latency: ${latency.toFixed(0)}ms`}
                    >
                      {latency.toFixed(0)}
                    </span>
                    <span
                      className="segment-download inline-flex items-center justify-center overflow-hidden px-1"
                      style={{ width: `${downloadWidth}%` }}
                      title={`Download: ${downloadTime.toFixed(0)}ms`}
                    >
                      {downloadTime.toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
