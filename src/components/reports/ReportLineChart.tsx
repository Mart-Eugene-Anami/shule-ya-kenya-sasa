import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface DataPoint {
  name: string;
  [key: string]: string | number;
}

interface LineConfig {
  dataKey: string;
  name: string;
  color: string;
  printColor?: string; // Darker color for print
  strokeWidth?: number;
  dotSize?: number;
}

interface ReportLineChartProps {
  data: DataPoint[];
  lines: LineConfig[];
  title?: string;
  height?: number;
  yAxisDomain?: [number, number];
  yAxisFormatter?: (value: number) => string;
  tooltipFormatter?: (value: number) => string;
  showGrid?: boolean;
  showLegend?: boolean;
  className?: string;
  printOptimized?: boolean;
}

// Print-friendly colors (high contrast, grayscale-friendly)
const PRINT_COLORS = [
  "#000000", // Black
  "#444444", // Dark gray
  "#888888", // Medium gray
  "#1a1a1a", // Near black
  "#666666", // Gray
  "#333333", // Charcoal
];

export function ReportLineChart({
  data,
  lines,
  title,
  height = 200,
  yAxisDomain = [0, 100],
  yAxisFormatter = (value) => `${value}%`,
  tooltipFormatter = (value) => `${value}%`,
  showGrid = true,
  showLegend = true,
  className = "",
  printOptimized = false,
}: ReportLineChartProps) {
  const chartData = useMemo(() => data, [data]);

  if (!chartData || chartData.length === 0) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground text-sm print:text-gray-600 ${className}`} style={{ height }}>
        No trend data available
      </div>
    );
  }

  // Use print-optimized colors when in print mode
  const getLineColor = (line: LineConfig, index: number) => {
    if (printOptimized) {
      return line.printColor || PRINT_COLORS[index % PRINT_COLORS.length];
    }
    return line.color;
  };

  return (
    <div className={`print-chart-container ${className}`}>
      {title && (
        <h4 className="font-semibold text-sm mb-2 print:text-black print:font-bold">{title}</h4>
      )}
      <div style={{ height }} className="print:bg-white">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            {showGrid && (
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke={printOptimized ? "#cccccc" : undefined}
                className={printOptimized ? "" : "stroke-muted print:stroke-gray-300"}
              />
            )}
            <XAxis
              dataKey="name"
              axisLine={printOptimized ? { stroke: "#666" } : false}
              tickLine={printOptimized ? { stroke: "#666" } : false}
              tick={{ 
                fontSize: printOptimized ? 9 : 10, 
                fill: printOptimized ? "#333" : "hsl(var(--muted-foreground))" 
              }}
              tickMargin={8}
            />
            <YAxis
              axisLine={printOptimized ? { stroke: "#666" } : false}
              tickLine={printOptimized ? { stroke: "#666" } : false}
              tick={{ 
                fontSize: printOptimized ? 9 : 10, 
                fill: printOptimized ? "#333" : "hsl(var(--muted-foreground))" 
              }}
              tickFormatter={yAxisFormatter}
              domain={yAxisDomain}
              width={35}
            />
            {!printOptimized && (
              <Tooltip
                formatter={(value) => tooltipFormatter(Number(value))}
                labelStyle={{ fontWeight: 500, fontSize: 12 }}
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                  fontSize: 12,
                }}
              />
            )}
            {showLegend && (
              <Legend
                wrapperStyle={{ 
                  fontSize: printOptimized ? 9 : 10,
                  color: printOptimized ? "#333" : undefined,
                }}
                iconSize={printOptimized ? 10 : 8}
              />
            )}
            {lines.map((line, index) => (
              <Line
                key={line.dataKey}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name}
                stroke={getLineColor(line, index)}
                strokeWidth={printOptimized ? (line.strokeWidth || 2) + 0.5 : (line.strokeWidth || 2)}
                dot={{ 
                  r: printOptimized ? (line.dotSize || 3) + 1 : (line.dotSize || 3),
                  fill: getLineColor(line, index),
                  stroke: printOptimized ? "#fff" : getLineColor(line, index),
                  strokeWidth: printOptimized ? 1 : 0,
                }}
                activeDot={printOptimized ? false : { r: (line.dotSize || 3) + 2 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Print-only data table for accessibility */}
      {printOptimized && (
        <div className="hidden print:block mt-2 text-xs">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-gray-400">
                <th className="text-left py-1 font-semibold">Exam</th>
                {lines.map((line) => (
                  <th key={line.dataKey} className="text-right py-1 font-semibold">
                    {line.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chartData.map((point, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-1">{point.name}</td>
                  {lines.map((line) => (
                    <td key={line.dataKey} className="text-right py-1">
                      {typeof point[line.dataKey] === 'number' 
                        ? `${point[line.dataKey]}%` 
                        : point[line.dataKey] || '-'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Pre-configured chart for subject performance trends
interface SubjectTrendChartProps {
  data: Array<{
    examName: string;
    score: number;
    average?: number;
  }>;
  subjectName: string;
  height?: number;
  className?: string;
  printOptimized?: boolean;
}

export function SubjectTrendChart({
  data,
  subjectName,
  height = 150,
  className,
  printOptimized = false,
}: SubjectTrendChartProps) {
  const chartData = data.map((d) => ({
    name: d.examName,
    score: d.score,
    ...(d.average !== undefined && { average: d.average }),
  }));

  const lines: LineConfig[] = [
    {
      dataKey: "score",
      name: "Your Score",
      color: "hsl(var(--primary))",
      printColor: "#000000",
      strokeWidth: 2,
    },
  ];

  if (data.some((d) => d.average !== undefined)) {
    lines.push({
      dataKey: "average",
      name: "Class Average",
      color: "hsl(var(--muted-foreground))",
      printColor: "#666666",
      strokeWidth: 1,
    });
  }

  return (
    <ReportLineChart
      data={chartData}
      lines={lines}
      title={`${subjectName} Performance Trend`}
      height={height}
      className={className}
      printOptimized={printOptimized}
    />
  );
}

// Pre-configured chart for overall performance trends
interface OverallTrendChartProps {
  data: Array<{
    examName: string;
    average: number;
    classAverage?: number;
    gradeAverage?: number;
  }>;
  height?: number;
  className?: string;
  printOptimized?: boolean;
}

export function OverallTrendChart({
  data,
  height = 180,
  className,
  printOptimized = false,
}: OverallTrendChartProps) {
  const chartData = data.map((d) => ({
    name: d.examName,
    average: d.average,
    ...(d.classAverage !== undefined && { classAverage: d.classAverage }),
    ...(d.gradeAverage !== undefined && { gradeAverage: d.gradeAverage }),
  }));

  const lines: LineConfig[] = [
    {
      dataKey: "average",
      name: "Your Average",
      color: "hsl(var(--primary))",
      printColor: "#000000",
      strokeWidth: 2,
      dotSize: 4,
    },
  ];

  if (data.some((d) => d.classAverage !== undefined)) {
    lines.push({
      dataKey: "classAverage",
      name: "Class Average",
      color: "hsl(142 76% 36%)",
      printColor: "#444444",
      strokeWidth: 1,
    });
  }

  if (data.some((d) => d.gradeAverage !== undefined)) {
    lines.push({
      dataKey: "gradeAverage",
      name: "Grade Average",
      color: "hsl(38 92% 50%)",
      printColor: "#888888",
      strokeWidth: 1,
    });
  }

  return (
    <ReportLineChart
      data={chartData}
      lines={lines}
      title="Overall Performance Trend"
      height={height}
      className={className}
      printOptimized={printOptimized}
    />
  );
}

// Multi-subject comparison line chart
interface MultiSubjectTrendChartProps {
  data: Array<{
    examName: string;
    subjects: Record<string, number>;
  }>;
  subjectColors?: Record<string, string>;
  height?: number;
  className?: string;
  printOptimized?: boolean;
}

const DEFAULT_COLORS = [
  "hsl(var(--primary))",
  "hsl(142 76% 36%)",
  "hsl(38 92% 50%)",
  "hsl(280 67% 51%)",
  "hsl(346 87% 61%)",
  "hsl(199 89% 48%)",
  "hsl(24 95% 53%)",
  "hsl(262 83% 58%)",
];

// Line patterns for print (using different dash patterns to distinguish lines)
const PRINT_LINE_STYLES = [
  { color: "#000000", dashArray: undefined },
  { color: "#444444", dashArray: "5 3" },
  { color: "#666666", dashArray: "2 2" },
  { color: "#1a1a1a", dashArray: "8 4 2 4" },
  { color: "#333333", dashArray: "10 5" },
  { color: "#555555", dashArray: "3 3 6 3" },
];

export function MultiSubjectTrendChart({
  data,
  subjectColors = {},
  height = 220,
  className,
  printOptimized = false,
}: MultiSubjectTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground text-sm print:text-gray-600 ${className}`} style={{ height }}>
        No subject trend data available
      </div>
    );
  }

  // Get all unique subjects
  const subjects = Array.from(
    new Set(data.flatMap((d) => Object.keys(d.subjects)))
  );

  const chartData = data.map((d) => ({
    name: d.examName,
    ...d.subjects,
  }));

  const lines: LineConfig[] = subjects.map((subject, index) => ({
    dataKey: subject,
    name: subject,
    color: subjectColors[subject] || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    printColor: PRINT_LINE_STYLES[index % PRINT_LINE_STYLES.length].color,
    strokeWidth: 2,
  }));

  return (
    <ReportLineChart
      data={chartData}
      lines={lines}
      title="Subject Performance Trends"
      height={height}
      className={className}
      printOptimized={printOptimized}
    />
  );
}
