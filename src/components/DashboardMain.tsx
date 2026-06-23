import { Segments } from "@/components/Segments";
import { VideoPlayer } from "@/components/VideoPlayer";

export function DashboardMain() {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <VideoPlayer />
      <Segments />
    </div>
  );
}
