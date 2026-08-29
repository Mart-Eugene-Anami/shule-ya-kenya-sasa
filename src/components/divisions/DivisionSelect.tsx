import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getDivisionsForDropdown } from "@/services/divisionService";

interface DivisionSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  includeAll?: boolean;
}

export const DivisionSelect = ({ 
  value, 
  onValueChange, 
  placeholder = "Select a division",
  disabled = false,
  includeAll = false,
}: DivisionSelectProps) => {
  const { user } = useAuth();
  const [divisions, setDivisions] = useState<Array<{ value: string; label: string; shortName: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDivisions = async () => {
      if (!user?.schoolId) return;
      
      try {
        setLoading(true);
        const divisionOptions = await getDivisionsForDropdown(user.schoolId);
        setDivisions(divisionOptions);
      } catch (error) {
        console.error('Error loading divisions:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDivisions();
  }, [user?.schoolId]);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading divisions..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (divisions.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="No divisions configured" />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {includeAll && (
          <SelectItem value="all">All Divisions</SelectItem>
        )}
        {divisions.map((division) => (
          <SelectItem key={division.value} value={division.value}>
            <span className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-5 text-xs font-medium rounded bg-primary/10 text-primary">
                {division.shortName}
              </span>
              {division.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default DivisionSelect;
