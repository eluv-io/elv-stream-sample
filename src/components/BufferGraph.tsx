import { useMemo } from "react";
import {
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from "chart.js";
import { Scatter } from "react-chartjs-2";

import { getPrimaryColor } from "@/lib/themes";
import { useMetricsStore } from "@/stores/useMetricsStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { useVideoStore } from "@/stores/useVideoStore";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend);

interface BufferGraphProps {
  name: string;
  data: Array<{ x: number; y: number }>;
  windowSize: number;
}

function BufferGraphChart({ name, data, windowSize, chartColor }: BufferGraphProps & { chartColor: string }) {
  const xMax = Math.max(...data.map((point) => point.x), windowSize);

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-3 text-sm font-semibold text-primary">{name}</h3>
      <Scatter
        options={{
          animation: false,
          plugins: {
            legend: { display: false },
          },
          scales: {
            y: {
              display: true,
              min: 0,
              ticks: {
                stepSize: 10,
                font: { size: 10 },
                color: chartColor,
              },
              suggestedMax: 30,
              grid: { color: `${chartColor}33` },
            },
            x: {
              display: true,
              min: xMax - windowSize,
              max: xMax,
              ticks: {
                callback: (value) => (Number(value) % 5 === 0 ? value : ""),
                stepSize: 10,
                font: { size: 10 },
                color: chartColor,
              },
              grid: { color: `${chartColor}33` },
            },
          },
        }}
        data={{
          datasets: [
            {
              showLine: true,
              data,
              borderCapStyle: "square",
              borderColor: chartColor,
              borderWidth: 2,
              tension: 0,
              pointRadius: 0,
              fill: false,
            },
          ],
        }}
      />
    </div>
  );
}

export function BufferGraph() {
  const playoutOptions = useVideoStore((state) => state.playoutOptions);
  const bufferData = useMetricsStore((state) => state.bufferData);
  const sampleWindow = useMetricsStore((state) => state.sampleWindow);
  const theme = useThemeStore((state) => state.theme);
  const chartColor = useMemo(() => getPrimaryColor(), [theme, bufferData.length]);

  if (!playoutOptions) {
    return null;
  }

  return (
    <BufferGraphChart
      name="Buffer Level (seconds)"
      data={bufferData}
      windowSize={sampleWindow}
      chartColor={chartColor}
    />
  );
}
