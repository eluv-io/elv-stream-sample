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
import { getEluvioConfiguration, onEnterPressed } from "@/lib/utils";
import { useRootStore } from "@/stores/useRootStore";
import { useVideoStore } from "@/stores/useVideoStore";

export function ContentInfo() {
  const contentId = useVideoStore((state) => state.contentId);
  const title = useVideoStore((state) => state.title);
  const error = useVideoStore((state) => state.error);
  const loadVideo = useVideoStore((state) => state.loadVideo);
  const initializeClient = useRootStore((state) => state.initializeClient);
  const [inputValue, setInputValue] = useState(contentId || "");
  const config = getEluvioConfiguration();
  const availableContent = config.availableContent || [];

  const submit = async () => {
    await initializeClient();
    await loadVideo({ contentId: inputValue });
  };

  const sampleContent = availableContent.find(
    (item) => item.versionHash === contentId,
  );

  return (
    <>
      <div className="flex flex-col gap-3 bg-muted/50 p-4 sm:flex-row sm:items-center">
        <div className="flex flex-1 gap-2">
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={onEnterPressed(submit)}
            placeholder="Object ID or Version Hash..."
          />
          <Button type="button" onClick={submit}>
            Load
          </Button>
        </div>

        {availableContent.length > 0 ? (
          <Select
            value={contentId || undefined}
            onValueChange={(value) => {
              setInputValue(value);
              void loadVideo({ contentId: value });
            }}
          >
            <SelectTrigger className="w-full sm:w-[240px]">
              <SelectValue placeholder="Sample Content..." />
            </SelectTrigger>
            <SelectContent>
              {availableContent.map(({ title: itemTitle, versionHash }) => (
                <SelectItem key={versionHash} value={versionHash}>
                  {itemTitle}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}
      </div>

      {error ? (
        <h1 className="px-4 py-3 text-center text-2xl font-medium text-destructive">{error}</h1>
      ) : sampleContent ? (
        <div className="px-4 py-3 text-center">
          <h1 className="text-2xl font-medium">{sampleContent.title || title}</h1>
          {sampleContent.subHeader ? (
            <h3 className="mt-1 text-lg text-muted-foreground">{sampleContent.subHeader}</h3>
          ) : null}
        </div>
      ) : title ? (
        <h1 className="px-4 py-3 text-center text-2xl font-medium">{title}</h1>
      ) : null}
    </>
  );
}
