import { AdvancedControls } from "@/components/AdvancedControls";
import { BufferGraph } from "@/components/BufferGraph";
import { PlayoutControls } from "@/components/PlayoutControls";
import { PlayoutInfo } from "@/components/PlayoutInfo";

export function DashboardSidebar() {
  return (
    <aside className="flex h-full min-h-0 flex-col gap-4 self-stretch p-4">
      <PlayoutControls />
      <BufferGraph />
      <PlayoutInfo />
      <AdvancedControls />
    </aside>
  );
}
