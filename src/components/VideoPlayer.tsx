import DashJS from "dashjs";
import HLSPlayer from "hls.js";
import Mux from "mux-embed";
import { useCallback, useEffect, useRef, useState } from "react";

import { LoadingOverlay } from "@/components/ui/loading-overlay";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { initializeFairPlayStream } from "@/lib/fairPlay";
import { useMetricsStore } from "@/stores/useMetricsStore";
import { useRootStore } from "@/stores/useRootStore";
import { useVideoStore } from "@/stores/useVideoStore";

type PlayerInstance =
  | HLSPlayer
  | ReturnType<typeof DashJS.MediaPlayer.prototype.create>;

export function VideoPlayer() {
  const loading = useVideoStore((state) => state.loading);
  const playoutOptions = useVideoStore((state) => state.playoutOptions);
  const protocol = useVideoStore((state) => state.protocol);
  const drm = useVideoStore((state) => state.drm);
  const hlsjsSupported = useVideoStore((state) => state.hlsjsSupported);
  const hlsjsOptions = useVideoStore((state) => state.hlsjsOptions);
  const loadId = useVideoStore((state) => state.loadId);
  const contentId = useVideoStore((state) => state.contentId);
  const posterUrl = useVideoStore((state) => state.posterUrl);
  const muted = useVideoStore((state) => state.muted);
  const volume = useVideoStore((state) => state.volume);
  const offering = useVideoStore((state) => state.offering);
  const title = useVideoStore((state) => state.title);
  const availableOfferings = useVideoStore((state) => state.availableOfferings);
  const availableChannels = useVideoStore((state) => state.availableChannels);
  const playerLevels = useVideoStore((state) => state.playerLevels);
  const playerCurrentLevel = useVideoStore((state) => state.playerCurrentLevel);
  const playerAudioTracks = useVideoStore((state) => state.playerAudioTracks);
  const playerCurrentAudioTrack = useVideoStore((state) => state.playerCurrentAudioTrack);
  const playerTextTracks = useVideoStore((state) => state.playerTextTracks);
  const playerCurrentTextTrack = useVideoStore((state) => state.playerCurrentTextTrack);
  const setOffering = useVideoStore((state) => state.setOffering);
  const setPlayerLevels = useVideoStore((state) => state.setPlayerLevels);
  const setAudioTracks = useVideoStore((state) => state.setAudioTracks);
  const setTextTracks = useVideoStore((state) => state.setTextTracks);
  const setBandwidthEstimate = useVideoStore((state) => state.setBandwidthEstimate);
  const updateVolume = useVideoStore((state) => state.updateVolume);
  const client = useRootStore((state) => state.client);

  const resetMetrics = useMetricsStore((state) => state.reset);
  const logBuffer = useMetricsStore((state) => state.logBuffer);
  const logSegment = useMetricsStore((state) => state.logSegment);
  const samplePeriod = useMetricsStore((state) => state.samplePeriod);

  const playerRef = useRef<PlayerInstance | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const bandwidthIntervalRef = useRef<number | undefined>(undefined);
  const metricsIntervalRef = useRef<number | undefined>(undefined);
  const initialTimeRef = useRef<number | undefined>(undefined);
  const [qualityLevel, setQualityLevel] = useState(-1);

  const stopSampling = useCallback(() => {
    if (metricsIntervalRef.current) {
      window.clearInterval(metricsIntervalRef.current);
      metricsIntervalRef.current = undefined;
    }
  }, []);

  const destroyPlayer = useCallback(() => {
    stopSampling();

    if (bandwidthIntervalRef.current) {
      window.clearInterval(bandwidthIntervalRef.current);
      bandwidthIntervalRef.current = undefined;
    }

    if (playerRef.current) {
      if ("destroy" in playerRef.current && typeof playerRef.current.destroy === "function") {
        playerRef.current.destroy();
      } else if ("reset" in playerRef.current && typeof playerRef.current.reset === "function") {
        playerRef.current.reset();
      }
      playerRef.current = null;
    }
  }, [stopSampling]);

  const startSampling = useCallback(
    (video: HTMLVideoElement) => {
      const sampleMs = samplePeriod * 1000;

      metricsIntervalRef.current = window.setInterval(() => {
        const buffer = video.buffered;
        const buffered = [...Array(buffer.length).keys()].reduce(
          (total, _, index) =>
            total + Math.max(0, buffer.end(index) - video.currentTime),
          0,
        );
        const currentTime = (performance.now() - (initialTimeRef.current || performance.now())) / 1000;

        logBuffer({ x: currentTime, y: buffered });
      }, sampleMs);
    },
    [logBuffer, samplePeriod],
  );

  const initializeMuxMonitoring = useCallback(
    async (video: HTMLVideoElement, playoutUrl: string) => {
      const options: Record<string, unknown> = {
        debug: false,
        data: {
          env_key: "2i5480sms8vdgj0sv9bv6lpk5",
          video_id: contentId,
          video_title: title,
          video_cdn: playoutUrl ? new URL(playoutUrl).hostname : "",
          viewer_user_id: await (
            client as unknown as { CurrentAccountAddress: () => Promise<string> }
          )?.CurrentAccountAddress(),
        },
      };

      if (playerRef.current) {
        if (protocol === "hls") {
          options.hlsjs = playerRef.current;
          options.Hls = HLSPlayer;
          (options.data as Record<string, string>).player_name = "stream-sample-hls";
        } else if (protocol === "dash") {
          options.dashjs = playerRef.current;
          (options.data as Record<string, string>).player_name = "stream-sample-dash";
        }
      }

      try {
        Mux.monitor(video, options);
      } catch (error) {
        console.error("Failed to initialize mux monitoring:");
        console.error(error);
      }
    },
    [client, contentId, protocol, title],
  );

  const initializeHls = useCallback(
    ({
      video,
      playoutUrl,
      drms,
    }: {
      video: HTMLVideoElement;
      playoutUrl: string;
      drms?: Record<string, { licenseServers?: string[] }>;
    }) => {
      const url = new URL(playoutUrl);
      const authorizationToken = url.searchParams.get("authorization");
      url.searchParams.delete("authorization");

      let drmSettings: Record<string, unknown> = {};
      if (["playready", "widevine"].includes(drm)) {
        drmSettings = {
          drmSystems: {},
          emeEnabled: true,
          licenseXhrSetup: (xhr: XMLHttpRequest, licenseUrl: string) => {
            xhr.open("POST", licenseUrl, true);
            xhr.setRequestHeader("Authorization", `Bearer ${authorizationToken}`);
          },
        };

        if (drm === "playready") {
          drmSettings.drmSystems = {
            "com.microsoft.playready": {
              licenseUrl: drms?.playready?.licenseServers?.[0],
            },
          };
        } else if (drm === "widevine") {
          drmSettings.drmSystems = {
            "com.widevine.alpha": {
              licenseUrl: drms?.widevine?.licenseServers?.[0],
            },
          };
        }
      }

      const player = new HLSPlayer({
        ...(hlsjsOptions as HLSPlayer["config"]),
        ...drmSettings,
        xhrSetup: (xhr: XMLHttpRequest) => {
          xhr.setRequestHeader("Authorization", `Bearer ${authorizationToken}`);
        },
      });

      playerRef.current = player;
      window.player = player;

      bandwidthIntervalRef.current = window.setInterval(() => {
        setBandwidthEstimate(player.bandwidthEstimate);
      }, 1000);

      player.loadSource(url.toString());
      player.attachMedia(video);

      player.on(HLSPlayer.Events.AUDIO_TRACK_SWITCHED, () => {
        const selectedTrackIndex = player.audioTrack;
        const tracks = Array.from(player.audioTracks).map((track) => ({
          index: track.id,
          label: track.name || track.lang || "Audio",
          active: track.id === selectedTrackIndex,
        }));

        setAudioTracks({ tracks, currentTrack: selectedTrackIndex });
      });

      const updateTextTracks = () => {
        setTextTracks({
          tracks: Array.from(video.textTracks).map((track, index) => ({
            index: track.id ? Number(track.id) : index,
            label: track.label || track.language || `Track ${index + 1}`,
          })),
          currentTrack: player.subtitleTrack,
        });
      };

      player.on(HLSPlayer.Events.SUBTITLE_TRACKS_UPDATED, updateTextTracks);
      player.on(HLSPlayer.Events.SUBTITLE_TRACK_LOADED, updateTextTracks);
      player.on(HLSPlayer.Events.SUBTITLE_TRACK_SWITCH, () => {
        setTextTracks({ currentTrack: player.subtitleTrack });
      });

      player.on(HLSPlayer.Events.LEVEL_SWITCHED, () => {
        setPlayerLevels({
          levels: player.levels.map((level, index) => ({
            resolution: level.attrs.RESOLUTION || "Unknown",
            bitrate: level.bitrate,
            qualityIndex: index,
          })),
          currentLevel: player.currentLevel,
        });
      });

      player.on(HLSPlayer.Events.FRAG_LOADED, (_, data) => {
        try {
          const frag = data.frag;
          if (frag.type !== "main" || frag.sn === "initSegment") {
            return;
          }

          const stats = frag.stats;
          const level = player.levels[frag.level];
          const bitrate = level.bitrate / 1000;
          const resolution = level.attrs.RESOLUTION || "Unknown";
          const size = stats.total / (1024 * 1024);
          const latency = Math.max(1, stats.loading.first - stats.loading.start) / 1000;
          const downloadTime = Math.max(1, stats.loading.end - stats.loading.first) / 1000;
          const downloadRate = (8 * stats.total) / downloadTime;
          const fullDownloadRate = (8 * stats.total) / (downloadTime + latency);

          logSegment({
            id: frag.sn.toString(),
            quality: `${resolution} (${bitrate} Kbps)`,
            size,
            duration: frag.duration,
            latency,
            downloadTime,
            downloadRate,
            fullDownloadRate,
          });
        } catch (error) {
          console.error("Error recording HLS segment stats:");
          console.error(error);
        }
      });
    },
    [drm, hlsjsOptions, logSegment, setAudioTracks, setBandwidthEstimate, setPlayerLevels, setTextTracks],
  );

  const initializeDash = useCallback(
    ({
      video,
      playoutUrl,
      drms,
    }: {
      video: HTMLVideoElement;
      playoutUrl: string;
      drms?: Record<string, { licenseServers?: string[] }>;
    }) => {
      const player = DashJS.MediaPlayer().create();
      playerRef.current = player;
      window.player = player;

      player.updateSettings({
        streaming: {
          buffer: { fastSwitchEnabled: true },
          text: { defaultEnabled: false },
        },
      });

      const url = new URL(playoutUrl);
      const authorizationToken = url.searchParams.get("authorization");
      url.searchParams.delete("authorization");

      (player as unknown as { extend: (...args: unknown[]) => void }).extend(
        "RequestModifier",
        function () {
          return {
            modifyRequestHeader: (xhr: XMLHttpRequest) => {
              xhr.setRequestHeader("Authorization", `Bearer ${authorizationToken}`);
              return xhr;
            },
            modifyRequestURL: (requestUrl: string) => requestUrl,
          };
        },
      );

      bandwidthIntervalRef.current = window.setInterval(() => {
        setBandwidthEstimate(player.getAverageThroughput("video") * 1000);
      }, 1000);

      if (drm === "widevine") {
        player.setProtectionData({
          "com.widevine.alpha": {
            serverURL: drms?.widevine?.licenseServers?.[0],
          },
        });
      }

      const updateQualityOptions = () => {
        try {
          setPlayerLevels({
            levels: player.getBitrateInfoListFor("video").map((level) => ({
              resolution: `${level.width}x${level.height}`,
              bitrate: level.bitrate,
              qualityIndex: level.qualityIndex,
            })),
            currentLevel: player.getQualityFor("video"),
          });
        } catch (error) {
          console.error("Failed to change quality", error);
        }
      };

      player.on(DashJS.MediaPlayer.events.CAN_PLAY, () => {
        updateQualityOptions();
        const currentAudioTrack = player.getCurrentTrackFor("audio");
        setAudioTracks({
          tracks: player.getTracksFor("audio").map((audioTrack) => ({
            index: audioTrack.index ?? 0,
            label:
              audioTrack.labels && audioTrack.labels.length > 0
                ? audioTrack.labels[0].text || audioTrack.lang || "Audio"
                : audioTrack.lang || "Audio",
          })),
          currentTrack: currentAudioTrack?.index ?? 0,
        });
      });

      player.on(DashJS.MediaPlayer.events.QUALITY_CHANGE_RENDERED, updateQualityOptions);
      player.on(DashJS.MediaPlayer.events.MANIFEST_LOADED, updateQualityOptions);

      player.on(DashJS.MediaPlayer.events.TEXT_TRACK_ADDED, () => {
        const activeTrackIndex = player.getCurrentTextTrackIndex();
        const tracks = player.getTracksFor("text").map((track, index) => ({
          index,
          label:
            track.labels && track.labels.length > 0
              ? track.labels[0].text || track.lang || `Track ${index + 1}`
              : track.lang || `Track ${index + 1}`,
          language: track.lang || undefined,
          active: index === activeTrackIndex,
        }));

        setTextTracks({ tracks, currentTrack: activeTrackIndex });
      });

      player.on(DashJS.MediaPlayer.events.FRAGMENT_LOADING_COMPLETED, (event) => {
        try {
          const payload = event as unknown as {
            request: {
              mediaType: string;
              index?: number;
              quality: number;
              duration: number;
              firstByteDate: Date;
              requestStartDate: Date;
              requestEndDate: Date;
            };
            response: { byteLength: number };
          };
          const { request, response } = payload;

          if (request.mediaType !== "video" || !request.index) {
            return;
          }

          const quality = player.getBitrateInfoListFor("video")[request.quality];
          const bitrate = quality.bitrate / 1000;
          const resolution = `${quality.width}x${quality.height}`;
          const size = response.byteLength / (1024 * 1024);
          const latency =
            Math.max(1, request.firstByteDate.getTime() - request.requestStartDate.getTime()) /
            1000;
          const downloadTime =
            Math.max(1, request.requestEndDate.getTime() - request.firstByteDate.getTime()) /
            1000;
          const downloadRate = (8 * response.byteLength) / downloadTime;
          const fullDownloadRate = (8 * response.byteLength) / (downloadTime + latency);

          logSegment({
            id: request.index.toString(),
            quality: `${resolution} (${bitrate} kbps)`,
            size,
            duration: request.duration,
            latency,
            downloadTime,
            downloadRate,
            fullDownloadRate,
          });
        } catch (error) {
          console.error("Error recording dash segment stats:");
          console.error(error);
        }
      });

      player.initialize(video, url.toString());
    },
    [drm, logSegment, setAudioTracks, setBandwidthEstimate, setPlayerLevels, setTextTracks],
  );

  const initializeVideo = useCallback(
    (video: HTMLVideoElement | null) => {
      videoRef.current = video;

      if (!video || !playoutOptions) {
        return;
      }

      setQualityLevel(-1);
      video.volume = volume;
      resetMetrics();
      destroyPlayer();

      const playoutMethod = playoutOptions[protocol]?.playoutMethods[drm];
      if (!playoutMethod) {
        return;
      }

      if (
        protocol === "hls" &&
        (!hlsjsSupported || drm === "sample-aes" || drm === "fairplay")
      ) {
        if (drm === "fairplay") {
          initializeFairPlayStream({ playoutOptions, video });
        }

        video.src = playoutMethod.playoutUrl;
        void initializeMuxMonitoring(video, playoutMethod.playoutUrl);
        return;
      }

      if (protocol === "hls") {
        initializeHls({
          video,
          playoutUrl: playoutMethod.playoutUrl,
          drms: playoutMethod.drms,
        });
      } else {
        initializeDash({
          video,
          playoutUrl: playoutMethod.playoutUrl,
          drms: playoutMethod.drms,
        });
      }

      void initializeMuxMonitoring(video, playoutMethod.playoutUrl);
      initialTimeRef.current = performance.now();
      startSampling(video);

      video.addEventListener("ended", stopSampling);
    },
    [
      destroyPlayer,
      drm,
      hlsjsSupported,
      initializeDash,
      initializeHls,
      initializeMuxMonitoring,
      playoutOptions,
      protocol,
      resetMetrics,
      startSampling,
      stopSampling,
      volume,
    ],
  );

  useEffect(() => {
    resetMetrics();
    return () => {
      destroyPlayer();
    };
  }, [destroyPlayer, resetMetrics]);

  useEffect(() => {
    setQualityLevel(-1);
  }, [loadId, contentId, protocol, drm]);

  const hasOfferings =
    Object.keys(availableOfferings || {}).length > 0 ||
    Object.keys(availableChannels || {}).length > 0;

  const setHlsLevel = (value: number) => {
    const player = playerRef.current as HLSPlayer | null;
    const video = videoRef.current;
    if (!player || !video || !("currentLevel" in player)) {
      return;
    }

    player.currentLevel = value;
    video.currentTime = Math.max(video.currentTime - 0.1, 0);
    setQualityLevel(value);
  };

  const setDashLevel = (value: number) => {
    const player = playerRef.current as ReturnType<typeof DashJS.MediaPlayer.prototype.create>;
    const video = videoRef.current;
    if (!player || !video) {
      return;
    }

    player.setQualityFor("video", value, true);
    player.updateSettings({
      streaming: {
        buffer: { fastSwitchEnabled: true },
        trackSwitchMode: { video: "alwaysReplace" },
        abr: { autoSwitchBitrate: { video: value === -1 } },
      },
    });

    video.currentTime = Math.max(video.currentTime - 0.1, 0);
    setQualityLevel(value >= 0 ? player.getQualityFor("video") : -1);
  };

  const currentLevel = playerLevels.find(
    (level) => level.qualityIndex === playerCurrentLevel,
  );
  const autoLabel =
    qualityLevel < 0 && currentLevel
      ? `Auto (${currentLevel.resolution})`
      : "Auto";

  return (
    <div className="p-4">
      <LoadingOverlay loading={loading} className="min-h-[320px] rounded-lg border bg-black/5">
        <video
          key={`video-${loadId}-${contentId}-${protocol}-${drm}`}
          ref={initializeVideo}
          poster={posterUrl}
          crossOrigin="anonymous"
          autoPlay
          muted={muted}
          playsInline
          controls={!!playoutOptions}
          onVolumeChange={(event) => updateVolume(event.nativeEvent)}
          className="aspect-video w-full rounded-lg bg-black"
        />

        <div className="mt-3 flex flex-wrap gap-2">
          {hasOfferings ? (
            <Select value={offering} onValueChange={setOffering}>
              <SelectTrigger className="w-[220px]">
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

          {playerTextTracks.length > 0 ? (
            <Select
              value={String(playerCurrentTextTrack)}
              onValueChange={(value) => {
                const index = parseInt(value, 10);
                const player = playerRef.current;

                if (player && "subtitleTrack" in player) {
                  (player as HLSPlayer).subtitleTrack = index;
                } else if (player && "setTextTrack" in player) {
                  (player as ReturnType<typeof DashJS.MediaPlayer.prototype.create>).setTextTrack(
                    index,
                  );
                }

                setTextTracks({ currentTrack: index });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Subtitles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">Subtitles: None</SelectItem>
                {playerTextTracks.map((track) => (
                  <SelectItem key={track.index} value={String(track.index)}>
                    Subtitles: {track.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {playerAudioTracks.length > 1 ? (
            <Select
              value={String(playerCurrentAudioTrack)}
              onValueChange={(value) => {
                const index = parseInt(value, 10);
                const player = playerRef.current;

                if (player && "audioTrack" in player) {
                  (player as HLSPlayer).audioTrack = index;
                } else if (player && "setCurrentTrack" in player) {
                  const track = (
                    player as ReturnType<typeof DashJS.MediaPlayer.prototype.create>
                  )
                    .getTracksFor("audio")
                    .find((audioTrack: { index: number | null }) => audioTrack.index === index);

                  if (track) {
                    (
                      player as ReturnType<typeof DashJS.MediaPlayer.prototype.create>
                    ).setCurrentTrack(track);
                  }
                }

                setAudioTracks({ currentTrack: index });
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Audio" />
              </SelectTrigger>
              <SelectContent>
                {playerAudioTracks.map(({ index, label }) => (
                  <SelectItem key={index} value={String(index)}>
                    Audio: {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : null}

          {playerLevels.length > 0 ? (
            <Select
              value={String(qualityLevel)}
              onValueChange={(value) => {
                const index = parseInt(value, 10);
                if (protocol === "hls") {
                  setHlsLevel(index);
                } else {
                  setDashLevel(index);
                }
              }}
            >
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder="Quality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="-1">{autoLabel}</SelectItem>
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
      </LoadingOverlay>
    </div>
  );
}
