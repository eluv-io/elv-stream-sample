import { ThemeSelector } from "@/components/ThemeSelector";
import { AdvancedControls } from "@/components/AdvancedControls";
import { BufferGraph } from "@/components/BufferGraph";
import { ContentInfo } from "@/components/ContentInfo";
import { PlayoutControls } from "@/components/PlayoutControls";
import { PlayoutInfo } from "@/components/PlayoutInfo";
import { Segments } from "@/components/Segments";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { VideoPlayer } from "@/components/VideoPlayer";
import { getEluvioConfiguration } from "@/lib/utils";
import { useRootStore } from "@/stores/useRootStore";

function AppContent() {
  const devMode = useRootStore((state) => state.devMode);
  const toggleDevMode = useRootStore((state) => state.toggleDevMode);

  return (
    <main className="flex flex-1 flex-col overflow-auto">
      <ContentInfo />
      <VideoPlayer />
      <PlayoutControls />
      <Segments />
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <BufferGraph />
        <PlayoutInfo />
        <AdvancedControls />
      </div>
      <button
        type="button"
        className="dev-mode-button"
        aria-label="Toggle dev mode"
        onClick={() => toggleDevMode(!devMode)}
      />
    </main>
  );
}

function DisplayAppContent() {
  const devMode = useRootStore((state) => state.devMode);
  const toggleDevMode = useRootStore((state) => state.toggleDevMode);

  return (
    <main className="flex flex-1 flex-col overflow-auto">
      <VideoPlayer />
      <PlayoutControls />
      <Segments />
      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <BufferGraph />
        <PlayoutInfo />
        <AdvancedControls />
      </div>
      <button
        type="button"
        className="dev-mode-button"
        aria-label="Toggle dev mode"
        onClick={() => toggleDevMode(!devMode)}
      />
    </main>
  );
}

export default function App() {
  const client = useRootStore((state) => state.client);
  const displayAppMode = useRootStore((state) => state.displayAppMode);
  const config = getEluvioConfiguration();

  return (
    <div className="flex min-h-screen flex-col">
      {!displayAppMode && (
        <header className="flex items-center justify-between border-b px-4 py-3">
          <h1 className="text-xl font-medium">Video Sample</h1>
          <ThemeSelector />
        </header>
      )}

      {displayAppMode ? (
        <div className="fixed top-3 right-3 z-50">
          <ThemeSelector compact />
        </div>
      ) : null}

      <LoadingOverlay loading={!client} fullPage>
        {displayAppMode ? <DisplayAppContent /> : <AppContent />}
      </LoadingOverlay>

      {config.version ? <div className="app-version">{config.version}</div> : null}
    </div>
  );
}
