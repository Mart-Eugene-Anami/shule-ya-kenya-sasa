
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface RankingItem {
  id: string;
  name: string;
  value: number;
  previousValue?: number;
  previousRank?: number;
  metadata?: { [key: string]: any };
}

interface RankingsTableProps {
  title: string;
  description?: string;
  data: RankingItem[];
  valueLabel?: string;
  showTrend?: boolean;
  className?: string;
  valueFormatter?: (value: number) => string;
}

export function RankingsTable({
  title,
  description,
  data,
  valueLabel = "Score",
  showTrend = true,
  className,
  valueFormatter = (value: number) => `${value.toFixed(1)}%`
}: RankingsTableProps) {
  // Sort data by value in descending order
  const sortedData = [...data].sort((a, b) => b.value - a.value);
  
  // Add rank property
  const rankedData = sortedData.map((item, index) => ({
    ...item,
    rank: index + 1
  }));
  
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">Rank</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">{valueLabel}</TableHead>
              {showTrend && <TableHead className="text-right">Change</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rankedData.length > 0 ? (
              rankedData.map((item) => {
                // Calculate rank change if previous rank exists
                let rankChange = null;
                if (showTrend && item.previousRank) {
                  rankChange = item.previousRank - item.rank;
                }
                
                // Calculate value change if previous value exists
                let valueChange = null;
                if (showTrend && item.previousValue !== undefined) {
                  valueChange = item.value - item.previousValue;
                }
                
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">
                      {item.rank <= 3 ? (
                        <Badge
                          variant={item.rank === 1 ? "default" : "outline"}
                        >
                          {item.rank}
                        </Badge>
                      ) : (
                        `${item.rank}`
                      )}
                    </TableCell>
                    <TableCell>{item.name}</TableCell>
                    <TableCell className="text-right">
                      {valueFormatter(item.value)}
                    </TableCell>
                    {showTrend && (
                      <TableCell className="text-right">
                        {valueChange !== null ? (
                           <span
                             className={
                               valueChange > 0
                                 ? "text-green-600"
                                 : valueChange < 0
                                 ? "text-red-600"
                                 : "text-muted-foreground"
                             }
                           >
                             {valueChange > 0 ? "+" : ""}
                             {valueFormatter(valueChange)}
                           </span>
                         ) : rankChange !== null ? (
                           <span
                             className={
                               rankChange > 0
                                 ? "text-green-600"
                                 : rankChange < 0
                                 ? "text-red-600"
                                 : "text-muted-foreground"
                             }
                           >
                             {rankChange > 0 ? "↑" : rankChange < 0 ? "↓" : "–"} 
                             {rankChange !== 0 ? Math.abs(rankChange) : ""}
                           </span>
                        ) : null}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
               <TableCell colSpan={showTrend ? 4 : 3} className="text-center py-6 text-muted-foreground">
                  No ranking data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
