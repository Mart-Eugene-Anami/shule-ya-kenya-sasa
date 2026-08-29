import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DivisionBadgeProps {
  divisionType: string;
  shortName?: string | null;
  name?: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const divisionColors: Record<string, string> = {
  lower_primary: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300",
  upper_primary: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/30 dark:text-sky-300",
  junior_secondary: "bg-violet-100 text-violet-800 border-violet-200 dark:bg-violet-900/30 dark:text-violet-300",
  senior_secondary: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300",
  "8-4-4": "bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-900/30 dark:text-rose-300",
};

const divisionLabels: Record<string, string> = {
  lower_primary: "LP",
  upper_primary: "UP",
  junior_secondary: "JS",
  senior_secondary: "SS",
  "8-4-4": "844",
};

export const DivisionBadge = ({ 
  divisionType, 
  shortName, 
  name,
  size = "md",
  className 
}: DivisionBadgeProps) => {
  const colorClass = divisionColors[divisionType] || "bg-muted text-muted-foreground border-muted";
  const displayText = shortName || divisionLabels[divisionType] || name?.substring(0, 2).toUpperCase() || "??";

  const sizeClasses = {
    sm: "text-[10px] px-1.5 py-0",
    md: "text-xs px-2 py-0.5",
    lg: "text-sm px-2.5 py-1",
  };

  return (
    <Badge 
      variant="outline" 
      className={cn(
        colorClass,
        sizeClasses[size],
        "font-medium",
        className
      )}
    >
      {displayText}
    </Badge>
  );
};

export default DivisionBadge;
