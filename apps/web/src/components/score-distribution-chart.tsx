import {
  CategoryScale,
  Chart as ChartJS,
  BarElement,
  Filler,
  Legend,
  LinearScale,
  Tooltip,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import type { ChartPoint } from "@workspace/api-client-react";

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend, Filler);

type Props = { points: ChartPoint[] };

export function ScoreDistributionChart({ points }: Props) {
  const data: ChartData<"bar"> = {
    labels: points.map((point) => point.label),
    datasets: [
      {
        label: "Candidates",
        data: points.map((point) => point.value),
        backgroundColor: "rgba(44, 111, 124, 0.78)",
        borderRadius: 3,
        borderSkipped: false,
        barPercentage: 0.72,
        categoryPercentage: 0.72,
      },
    ],
  };
  const options: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { displayColors: false },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: "#6d7a7c", font: { family: "DM Mono", size: 10 } },
        border: { display: false },
      },
      y: {
        beginAtZero: true,
        grid: { color: "rgba(40, 56, 58, 0.08)" },
        ticks: { color: "#6d7a7c", font: { family: "DM Mono", size: 10 }, precision: 0 },
        border: { display: false },
      },
    },
  };

  return (
    <div className="h-48" data-testid="chartjs-score-distribution">
      <Bar data={data} options={options} />
    </div>
  );
}