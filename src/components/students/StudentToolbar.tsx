
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, Upload } from "lucide-react";

interface StudentToolbarProps {
  search: string;
  onSearchChange: (value: string) => void;
  onAddStudent: () => void;
  onBulkImport: () => void;
}

const StudentToolbar = ({
  search,
  onSearchChange,
  onAddStudent,
  onBulkImport,
}: StudentToolbarProps) => {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
      <div className="relative w-full sm:max-w-xs">
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search students..."
          className="pl-8"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>
      <div className="flex gap-2 w-full sm:w-auto">
        <Button
          className="bg-school-primary hover:bg-school-secondary"
          onClick={onAddStudent}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Student
        </Button>
        <Button
          variant="outline"
          onClick={onBulkImport}
        >
          <Upload className="mr-2 h-4 w-4" />
          Bulk Import
        </Button>
      </div>
    </div>
  );
};

export default StudentToolbar;
