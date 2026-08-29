import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

interface ExamPerformanceChartProps {
  title: string;
  description?: string;
  data: Array<{
    name: string;
    value: number;
    rank?: number;
    [key: string]: any;
  }>;
  dataKey: string;
  colors?: string[];
  className?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  showRankings?: boolean;
}

export function ExamPerformanceChart({
  title,
  description,
  data,
  dataKey,
  colors = ["hsl(var(--primary))"],
  className,
  height = 300,
  valueFormatter = (value: number) => `${value}%`,
  showRankings = false
}: ExamPerformanceChartProps) {
  // Sort data by rank if showRankings is true and ranks exist
  const chartData = showRankings && data[0]?.rank 
    ? [...data].sort((a, b) => (a.rank || 0) - (b.rank || 0))
    : data;
    
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                tickMargin={8}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: "hsl(var(--muted-foreground))" }}
                tickFormatter={(value) => `${value}%`}
                domain={[0, 100]}
              />
              <Tooltip 
                formatter={(value) => valueFormatter(Number(value))}
                labelStyle={{ fontWeight: 500 }}
                contentStyle={{ 
                  backgroundColor: "hsl(var(--popover))", 
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px"
                }}
              />
              <Bar 
                dataKey={dataKey} 
                fill={colors[0]} 
                radius={[4, 4, 0, 0]} 
                maxBarSize={60}
              >
                {showRankings && (
                  <LabelList 
                    dataKey="rank" 
                    position="top" 
                    formatter={(value: number) => `#${value}`} 
                    style={{ 
                      fill: 'hsl(var(--muted-foreground))', 
                      fontSize: 12, 
                      fontWeight: 500 
                    }}
                  />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
