import { ExternalLink, Pencil } from "lucide-react";

import { CopyButton } from "@/components/ui/copy-button";
import { useVideoStore } from "@/stores/useVideoStore";

function UrlSection({
  title,
  value,
  editHref,
}: {
  title: string;
  value: string;
  editHref?: string;
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
        <div className="flex items-center gap-1">
          <CopyButton value={value} />
          {editHref ? (
            <a
              href={editHref}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-accent"
            >
              <Pencil className="h-4 w-4" />
            </a>
          ) : null}
        </div>
      </div>
      <p className="playout-url">{value}</p>
    </div>
  );
}

export function PlayoutInfo() {
  const playoutOptions = useVideoStore((state) => state.playoutOptions);
  const protocol = useVideoStore((state) => state.protocol);
  const drm = useVideoStore((state) => state.drm);
  const embedUrl = useVideoStore((state) => state.embedUrl);
  const srtUrl = useVideoStore((state) => state.srtUrl);

  if (!playoutOptions) {
    return null;
  }

  const playoutInfo = playoutOptions[protocol]?.playoutMethods[drm];
  if (!playoutInfo) {
    return null;
  }

  const playoutUrl = playoutInfo.staticPlayoutUrl || playoutInfo.playoutUrl;
  let embedFormUrl: string | undefined;

  if (embedUrl) {
    const url = new URL(embedUrl);
    url.searchParams.delete("p");
    embedFormUrl = url.toString();
  }

  const licenseServer =
    ["widevine", "playready"].includes(drm) &&
    playoutInfo.drms?.[drm]?.licenseServers?.[0];

  return (
    <div className="space-y-4">
      {embedUrl ? (
        <UrlSection title="Embeddable URL" value={embedUrl} editHref={embedFormUrl} />
      ) : null}

      {playoutInfo.globalPlayoutUrl ? (
        <UrlSection title="Global Playout URL" value={playoutInfo.globalPlayoutUrl} />
      ) : null}

      <UrlSection title="Playout URL" value={playoutUrl} />

      {srtUrl ? <UrlSection title="SRT URL" value={srtUrl} /> : null}

      {licenseServer ? (
        <div className="rounded-lg border p-4">
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              License Server URL
            </h3>
            <CopyButton value={licenseServer} />
          </div>
          <p className="playout-url">{licenseServer}</p>
          <a
            href={licenseServer}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Open license server
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      ) : null}
    </div>
  );
}
