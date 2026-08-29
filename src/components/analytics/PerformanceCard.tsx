
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface PerformanceCardProps {
  title: string;
  value: string | number;
  description?: string;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  ranking?: {
    position: number;
    total: number;
    label?: string;
  };
  className?: string;
}

export function PerformanceCard({
  title,
  value,
  description,
  trend,
  ranking,
  className,
}: PerformanceCardProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="flex items-end justify-between">
          <div className="text-2xl font-bold">{value}</div>
          <div className="space-y-1">
            {trend && (
              <div className={cn(
                "flex items-center text-xs",
                trend.isPositive ? "text-green-600" : "text-red-600"
              )}>
                {trend.isPositive ? (
                  <ArrowUp className="mr-1 h-4 w-4" />
                ) : (
                  <ArrowDown className="mr-1 h-4 w-4" />
                )}
                <span>{trend.value}%</span>
                <span className="ml-1 text-muted-foreground">{trend.label}</span>
              </div>
            )}
            
            {ranking && (
              <div className="flex items-center text-xs font-medium">
                <span className="text-primary mr-1">Rank:</span>
                <span>{ranking.position}</span>
                <span className="mx-1">of</span>
                <span>{ranking.total}</span>
                {ranking.label && (
                  <span className="ml-1 text-muted-foreground">{ranking.label}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
