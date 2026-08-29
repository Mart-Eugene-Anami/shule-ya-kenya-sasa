import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface SubjectComparisonChartProps {
  title: string;
  description?: string;
  data: Array<{
    name: string;
    [key: string]: any;
  }>;
  subjects: Array<{
    name: string;
    dataKey: string;
    color: string;
    ranking?: {
      value: number;
      total: number;
    };
  }>;
  className?: string;
  height?: number;
  valueFormatter?: (value: number) => string;
  showRankings?: boolean;
}

export function SubjectComparisonChart({
  title,
  description,
  data,
  subjects,
  className,
  height = 300,
  valueFormatter = (value: number) => `${value}%`,
  showRankings = false
}: SubjectComparisonChartProps) {
  
  // Custom formatter for the legend to show rankings
  const renderLegendText = (value: any) => {
    const subject = subjects.find(s => s.name === value || s.dataKey === value);
    const ranking = subject?.ranking;
    
    if (showRankings && ranking) {
      return <span>{value} <span className="text-xs ml-1 text-muted-foreground">(Rank: {ranking.value}/{ranking.total})</span></span>;
    }
    
    return value;
  };
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div style={{ height: height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
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
              {/* Fixed formatter to match the expected type */}
              <Legend formatter={renderLegendText} />
              {subjects.map((subject) => (
                <Line
                  key={subject.dataKey}
                  type="monotone"
                  dataKey={subject.dataKey}
                  name={subject.name}
                  stroke={subject.color}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        {/* Moved the custom legend items to outside the chart */}
        {showRankings && (
          <div className="mt-4 flex flex-wrap gap-4">
            {subjects.map((subject, index) => (
              <span className="inline-flex items-center" key={`legend-item-${index}`}>
                <span 
                  className="inline-block w-3 h-3 mr-1"
                  style={{ backgroundColor: subject.color }}
                />
                <span className="text-sm">{subject.name}</span>
                {subject.ranking && (
                  <span className="text-xs ml-1 text-muted-foreground">
                    (Rank: {subject.ranking.value}/{subject.ranking.total})
                  </span>
                )}
              </span>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
