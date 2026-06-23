import { ThemeSelector } from "@/components/ThemeSelector";
import { ContentInfo } from "@/components/ContentInfo";
import { DashboardMain } from "@/components/DashboardMain";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { getEluvioConfiguration } from "@/lib/utils";
import { useRootStore } from "@/stores/useRootStore";

function DashboardLayout({ showContentInfo = false }: { showContentInfo?: boolean }) {
  const devMode = useRootStore((state) => state.devMode);
  const toggleDevMode = useRootStore((state) => state.toggleDevMode);

  return (
    <main className="flex min-h-0 flex-1 flex-col">
      {showContentInfo ? <ContentInfo /> : null}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-[minmax(0,65fr)_minmax(400px,35fr)] lg:items-stretch">
        <DashboardMain />
        <DashboardSidebar />
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

function AppContent() {
  return <DashboardLayout showContentInfo />;
}

function DisplayAppContent() {
  return <DashboardLayout />;
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
