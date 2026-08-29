import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SimpleBarChartProps {
  title?: string;
  data: Array<{
    name: string;
    average: number;
    highest?: number;
    lowest?: number;
    [key: string]: any;
  }>;
  height?: number;
}

export function SimpleBarChart({ title, data, height = 300 }: SimpleBarChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: "hsl(var(--popover))", 
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }}
          />
          <Bar dataKey="average" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={60} name="Average" />
          <Bar dataKey="highest" fill="hsl(142.1 76.2% 36.3%)" radius={[4, 4, 0, 0]} maxBarSize={60} name="Highest" />
          <Bar dataKey="lowest" fill="hsl(24.6 95% 53.1%)" radius={[4, 4, 0, 0]} maxBarSize={60} name="Lowest" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

interface SimpleSubjectBarChartProps {
  data: Array<{
    subject: string;
    average: number;
  }>;
  height?: number;
}

export function SimpleSubjectBarChart({ data, height = 300 }: SimpleSubjectBarChartProps) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} className="stroke-muted" />
          <XAxis 
            type="number"
            axisLine={false}
            tickLine={false}
            domain={[0, 100]}
            tick={{ fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis 
            type="category"
            dataKey="subject" 
            axisLine={false}
            tickLine={false}
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
            width={70}
          />
          <Tooltip 
            formatter={(value: number) => `${value}%`}
            contentStyle={{ 
              backgroundColor: "hsl(var(--popover))", 
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px"
            }}
          />
          <Bar dataKey="average" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} maxBarSize={30} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
