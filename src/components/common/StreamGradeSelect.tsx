import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getStreamGradeCombinationsForDropdown } from "@/services/academicService";

interface StreamGradeSelectProps {
  value?: string;
  onValueChange: (value: string, combo?: any) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const StreamGradeSelect = ({ 
  value, 
  onValueChange, 
  placeholder = "Select grade and stream",
  disabled = false 
}: StreamGradeSelectProps) => {
  const { user } = useAuth();
  const [combinations, setCombinations] = useState<Array<{
    value: string;
    label: string;
    gradeId: string;
    streamId: string;
    gradeName: string;
    streamName: string;
  }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCombinations = async () => {
      if (!user?.schoolId) return;
      
      try {
        setLoading(true);
        const combos = await getStreamGradeCombinationsForDropdown(user.schoolId);
        setCombinations(combos);
      } catch (error) {
        console.error('Error loading stream-grade combinations:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCombinations();
  }, [user?.schoolId]);

  const handleValueChange = (selectedValue: string) => {
    const selectedCombo = combinations.find(combo => combo.value === selectedValue);
    onValueChange(selectedValue, selectedCombo);
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading combinations..." />
        </SelectTrigger>
      </Select>
    );
  }

  return (
    <Select value={value} onValueChange={handleValueChange} disabled={disabled}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {combinations.map((combo) => (
          <SelectItem key={combo.value} value={combo.value}>
            {combo.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default StreamGradeSelect;