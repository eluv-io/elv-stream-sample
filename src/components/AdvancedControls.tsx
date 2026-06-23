import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useRootStore } from "@/stores/useRootStore";
import { useVideoStore } from "@/stores/useVideoStore";

const REGIONS = [
  ["Automatic", ""],
  ["NA Northeast", "na-east-north"],
  ["NA Southeast", "na-east-south"],
  ["NA Northwest", "na-west-north"],
  ["NA Southwest", "na-west-south"],
  ["EU Northeast", "eu-east-north"],
  ["EU Southeast", "eu-east-south"],
  ["EU Northwest", "eu-west-north"],
  ["EU Southwest", "eu-west-south"],
  ["AU East", "au-east"],
  ["AS East", "as-east"],
] as const;

export function AdvancedControls() {
  const loading = useVideoStore((state) => state.loading);
  const playoutUrlParams = useVideoStore((state) => state.playoutUrlParams);
  const hlsjsOptions = useVideoStore((state) => state.hlsjsOptions);
  const playerProfile = useVideoStore((state) => state.playerProfile);
  const playoutType = useVideoStore((state) => state.playoutType);
  const playoutHandler = useVideoStore((state) => state.playoutHandler);
  const contentId = useVideoStore((state) => state.contentId);
  const setPlayoutUrlParams = useVideoStore((state) => state.setPlayoutUrlParams);
  const setHlsjsOptions = useVideoStore((state) => state.setHlsjsOptions);
  const setAuthContext = useVideoStore((state) => state.setAuthContext);
  const setPlayerProfile = useVideoStore((state) => state.setPlayerProfile);
  const setPlayoutType = useVideoStore((state) => state.setPlayoutType);
  const setPlayoutHandler = useVideoStore((state) => state.setPlayoutHandler);
  const loadVideo = useVideoStore((state) => state.loadVideo);

  const devMode = useRootStore((state) => state.devMode);
  const nodes = useRootStore((state) => state.nodes);
  const region = useRootStore((state) => state.region);
  const fabricNode = useRootStore((state) => state.fabricNode);
  const customFabricNode = useRootStore((state) => state.customFabricNode);
  const ethNode = useRootStore((state) => state.ethNode);
  const setRegion = useRootStore((state) => state.setRegion);
  const setFabricNode = useRootStore((state) => state.setFabricNode);
  const setCustomFabricNode = useRootStore((state) => state.setCustomFabricNode);
  const setEthNode = useRootStore((state) => state.setEthNode);
  const initializeClient = useRootStore((state) => state.initializeClient);

  const [visible, setVisible] = useState(false);
  const [authContext, setAuthContextValue] = useState("{}");

  const toggleButton = (
    <Button
      type="button"
      className="w-full"
      variant="default"
      onClick={() => setVisible((current) => !current)}
    >
      Advanced Controls
    </Button>
  );

  if (!visible) {
    if (loading) {
      return null;
    }

    return <div className="rounded-lg border p-4">{toggleButton}</div>;
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border p-4">{toggleButton}</div>

      <ControlSection title="Playout Handler">
        <Select value={playoutHandler} onValueChange={setPlayoutHandler}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="playout">Default</SelectItem>
            <SelectItem value="playout_scte">SCTE</SelectItem>
          </SelectContent>
        </Select>
      </ControlSection>

      <ControlSection title="Playout Type">
        <Select
          value={playoutType || "__default__"}
          onValueChange={(value) =>
            setPlayoutType(value === "__default__" ? "" : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Default" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__default__">Default</SelectItem>
            <SelectItem value="vod">VOD</SelectItem>
          </SelectContent>
        </Select>
      </ControlSection>

      <ControlSection title="HLS Player Profile">
        <Select value={playerProfile} onValueChange={setPlayerProfile}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="default">Default</SelectItem>
            <SelectItem value="ll">Low Latency Live</SelectItem>
            <SelectItem value="ull">Ultra Low Latency Live</SelectItem>
          </SelectContent>
        </Select>
      </ControlSection>

      <ControlSection title="Region">
        <Select
          value={region || "__automatic__"}
          onValueChange={(value) => void setRegion(value === "__automatic__" ? "" : value)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {REGIONS.map(([label, value]) => (
              <SelectItem key={value || "__automatic__"} value={value || "__automatic__"}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </ControlSection>

      <ControlSection title="Fabric Node">
        <Select
          value={fabricNode || "__automatic__"}
          onValueChange={(value) =>
            setFabricNode(value === "__automatic__" ? "" : value)
          }
        >
          <SelectTrigger>
            <SelectValue placeholder="Automatic" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__automatic__">Automatic</SelectItem>
            {(nodes?.fabricURIs || []).map((node) => (
              <SelectItem key={node} value={node}>
                {node}
              </SelectItem>
            ))}
            <SelectItem value="custom">Custom</SelectItem>
          </SelectContent>
        </Select>
        {fabricNode === "custom" ? (
          <Input
            placeholder="Fabric Node"
            value={customFabricNode}
            onChange={(event) => setCustomFabricNode(event.target.value)}
          />
        ) : null}
      </ControlSection>

      {devMode ? (
        <ControlSection title="Blockchain Node">
          <Select
            value={ethNode || "__automatic__"}
            onValueChange={(value) => setEthNode(value === "__automatic__" ? "" : value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Automatic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__automatic__">Automatic</SelectItem>
              {(nodes?.ethereumURIs || []).map((node) => (
                <SelectItem key={node} value={node}>
                  {node}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ControlSection>
      ) : null}

      <ControlSection title="Auth Context">
        <Textarea
          value={authContext}
          onChange={async (event) => {
            setAuthContextValue(event.target.value);

            try {
              const context = event.target.value
                ? JSON.parse(event.target.value)
                : undefined;

              if (context) {
                await setAuthContext(context);
              }
            } catch {
              // Ignore invalid JSON while typing
            }
          }}
        />
      </ControlSection>

      <ControlSection title="HLS JS Options" key={`hls-js-options-${playerProfile}`}>
        <Textarea
          value={JSON.stringify(hlsjsOptions, null, 2)}
          onChange={(event) => {
            try {
              setHlsjsOptions(JSON.parse(event.target.value));
            } catch (error) {
              console.error(error);
            }
          }}
        />
        <a
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary hover:underline"
          href="https://github.com/video-dev/hls.js/blob/master/docs/API.md"
        >
          API Docs
        </a>
      </ControlSection>

      <ControlSection title="Playout URL Parameters">
        <Textarea
          value={JSON.stringify(playoutUrlParams, null, 2)}
          onChange={(event) => {
            try {
              setPlayoutUrlParams(JSON.parse(event.target.value));
            } catch (error) {
              console.error(error);
            }
          }}
        />
      </ControlSection>

      <div className="rounded-lg border p-4">
        <Button
          type="button"
          onClick={async () => {
            await initializeClient();
            await loadVideo({ contentId });
          }}
        >
          Reload
        </Button>
      </div>
    </div>
  );
}

function ControlSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2 rounded-lg border p-4">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      {children}
    </div>
  );
}
