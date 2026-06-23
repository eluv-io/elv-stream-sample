import { Button } from "@/components/ui/button";
import { DISPLAY_MAP, useVideoStore } from "@/stores/useVideoStore";
import { useRootStore } from "@/stores/useRootStore";

function getDrms(
  protocol: string,
  playoutOptions: ReturnType<typeof useVideoStore.getState>["playoutOptions"],
  aesOption: string,
  availableDRMs: string[],
) {
  let drms =
    protocol === "dash" ? ["clear", "widevine"] : ["clear", aesOption];

  if (playoutOptions) {
    drms = Object.keys(playoutOptions[protocol]?.playoutMethods || {}).sort((a) =>
      a === "clear" ? -1 : 1,
    );
  }

  return drms.filter((drm) => availableDRMs.includes(drm));
}

export function PlayoutControls() {
  const playoutOptions = useVideoStore((state) => state.playoutOptions);
  const protocol = useVideoStore((state) => state.protocol);
  const drm = useVideoStore((state) => state.drm);
  const aesOption = useVideoStore((state) => state.aesOption);
  const dashjsSupported = useVideoStore((state) => state.dashjsSupported);
  const setProtocol = useVideoStore((state) => state.setProtocol);
  const setDrm = useVideoStore((state) => state.setDrm);
  const availableDRMs = useRootStore((state) => state.availableDRMs);

  if (!playoutOptions) {
    return null;
  }

  let protocols = Object.keys(playoutOptions);
  protocols = protocols.filter(
    (protocolKey) => getDrms(protocolKey, playoutOptions, aesOption, availableDRMs).length > 0,
  );

  if (!dashjsSupported) {
    protocols = protocols.filter((protocolKey) => protocolKey !== "dash");
  }

  const drms = getDrms(protocol, playoutOptions, aesOption, availableDRMs);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Playout Options</h3>
      <div className="mb-3 flex flex-wrap gap-2">
        {protocols.map((protocolKey) => (
          <Button
            key={`protocol-${protocolKey}`}
            type="button"
            variant={protocol === protocolKey ? "default" : "secondary"}
            onClick={() => setProtocol(protocolKey)}
          >
            {DISPLAY_MAP[protocolKey]}
          </Button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {drms.map((drmKey) => (
          <Button
            key={`drm-${drmKey}`}
            type="button"
            variant={drm === drmKey ? "default" : "secondary"}
            onClick={() => setDrm(drmKey)}
          >
            {DISPLAY_MAP[drmKey]}
          </Button>
        ))}
      </div>
    </div>
  );
}
