import { useEffect, useState } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { getStreamsForDropdown } from "@/services/academicService";

interface StreamSelectProps {
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const StreamSelect = ({ 
  value, 
  onValueChange, 
  placeholder = "Select a stream",
  disabled = false 
}: StreamSelectProps) => {
  const { user } = useAuth();
  const [streams, setStreams] = useState<Array<{ value: string; label: string }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStreams = async () => {
      if (!user?.schoolId) return;
      
      try {
        setLoading(true);
        const streamOptions = await getStreamsForDropdown(user.schoolId);
        setStreams(streamOptions);
      } catch (error) {
        console.error('Error loading streams:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStreams();
  }, [user?.schoolId]);

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger>
          <SelectValue placeholder="Loading streams..." />
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
        {streams.map((stream) => (
          <SelectItem key={stream.value} value={stream.value}>
            {stream.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default StreamSelect;