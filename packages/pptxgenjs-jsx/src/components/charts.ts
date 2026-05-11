import { chartComponent, component } from "./factory";
import type {
  AreaChartProps,
  Bar3DChartProps,
  BarChartProps,
  BubbleChartProps,
  ChartProps,
  DoughnutChartProps,
  LineChartProps,
  PieChartProps,
  RadarChartProps,
  ScatterChartProps,
} from "./types";

export const Chart = component<"Chart", ChartProps>("Chart");

export const AreaChart = chartComponent<AreaChartProps>("AreaChart", "area");
export const BarChart = chartComponent<BarChartProps>("BarChart", "bar");
export const Bar3DChart = chartComponent<Bar3DChartProps>("Bar3DChart", "bar3D");
export const BubbleChart = chartComponent<BubbleChartProps>("BubbleChart", "bubble");
export const DoughnutChart = chartComponent<DoughnutChartProps>("DoughnutChart", "doughnut");
export const LineChart = chartComponent<LineChartProps>("LineChart", "line");
export const PieChart = chartComponent<PieChartProps>("PieChart", "pie");
export const RadarChart = chartComponent<RadarChartProps>("RadarChart", "radar");
export const ScatterChart = chartComponent<ScatterChartProps>("ScatterChart", "scatter");
