import PrettyBytes from "pretty-bytes";
import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useMetricsStore } from "@/stores/useMetricsStore";
import { useRootStore } from "@/stores/useRootStore";
import { useVideoStore } from "@/stores/useVideoStore";

export function Segments() {
  const playoutOptions = useVideoStore((state) => state.playoutOptions);
  const metricsSupported = useVideoStore((state) => state.metricsSupported());
  const bandwidthEstimate = useVideoStore((state) => state.bandwidthEstimate);
  const offering = useVideoStore((state) => state.offering);
  const availableOfferings = useVideoStore((state) => state.availableOfferings);
  const availableChannels = useVideoStore((state) => state.availableChannels);
  const playerLevels = useVideoStore((state) => state.playerLevels);
  const qualityLevel = useVideoStore((state) => state.qualityLevel);
  const qualityAutoLabel = useVideoStore((state) => state.qualityAutoLabel);
  const setOffering = useVideoStore((state) => state.setOffering);
  const setQualityLevel = useVideoStore((state) => state.setQualityLevel);
  const segmentData = useMetricsStore((state) => state.segmentData);
  const devMode = useRootStore((state) => state.devMode);
  const [timingScale, setTimingScale] = useState(2000);

  const hasOfferings =
    Object.keys(availableOfferings || {}).length > 0 ||
    Object.keys(availableChannels || {}).length > 0;

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
    <div className="flex min-h-0 flex-1 flex-col border-t p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="flex flex-wrap items-center gap-2 text-sm font-semibold text-primary">
          <span>Segment Metrics</span>
          {devMode ? (
            <span className="font-normal text-muted-foreground">
              Player Bandwidth Estimate:
              <span className="ml-2 font-medium text-foreground">
                {PrettyBytes(bandwidthEstimate || 0, { bits: true })}/s
              </span>
            </span>
          ) : null}
        </h3>

        <div className="flex flex-wrap items-center gap-2">
          {hasOfferings ? (
            <Select value={offering} onValueChange={setOffering}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(availableOfferings).map((offeringKey) => (
                  <SelectItem key={offeringKey} value={offeringKey}>
                    Offering: {availableOfferings[offeringKey].display_name || offeringKey}
                  </SelectItem>
                ))}
                {Object.keys(availableChannels || {}).map((channelKey) => (
                  <SelectItem key={channelKey} value={`channel--${channelKey}`}>
                    Channel: {availableChannels[channelKey].display_name || channelKey}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {playerLevels.length > 0 ? (
            <Select
              value={String(qualityLevel)}
              onValueChange={(value) => setQualityLevel(parseInt(value, 10))}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">{qualityAutoLabel}</SelectItem>
                {playerLevels.map((level, levelIndex) => {
                  const value =
                    typeof level.qualityIndex === "undefined"
                      ? levelIndex
                      : level.qualityIndex;

                  return (
                    <SelectItem key={`level-${levelIndex}`} value={String(value)}>
                      {`${level.resolution} (${(level.bitrate / 1000 / 1000).toFixed(1)}Mbps)`}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          ) : null}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-x-auto overflow-y-auto rounded-lg border">
        <div className="grid min-w-[900px] grid-cols-6 gap-2 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
          <div>ID</div>
          <div>Quality</div>
          <div>Size</div>
          <div>Download Rate</div>
          <div>Throughput</div>
          <div>Timing (ms)</div>
        </div>
        <div className="max-h-none overflow-y-visible">
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
