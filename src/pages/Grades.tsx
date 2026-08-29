import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Grade } from "../types";
import { Edit, Trash2, Search, Plus, ChevronRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useDataQuery } from "../hooks/useDataQuery";
import { useCurriculumTerminology } from "../hooks/useCurriculumTerminology";
import { createGrade, updateGrade, deleteGrade } from "../services/academicService";

const Grades = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { terminology, curriculum } = useCurriculumTerminology();
  
  console.log('Current user in Grades:', user);
  
  // Fetch grades from database
  const { 
    data: grades = [], 
    isLoading: gradesLoading, 
    refetch: refetchGrades 
  } = useDataQuery<Grade>({
    tableName: 'grades',
    schoolId: user?.schoolId || undefined,
    orderBy: 'level',
    orderDirection: 'asc'
  });

  console.log('Fetched grades:', grades);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [gradeToDelete, setGradeToDelete] = useState<Grade | null>(null);
  const [search, setSearch] = useState("");
  const [curriculumFilter, setCurriculumFilter] = useState<string>("all");
  const [isCreating, setIsCreating] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    level: "",
    curriculum: "cbc",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData({ ...formData, [name]: value });
  };

  const handleCreateGrade = async () => {
    console.log('Creating grade with form data:', formData);
    console.log('User school ID:', user?.schoolId);

    if (!formData.name || !formData.level) {
      toast({
        title: "Missing information",
        description: "Please provide all required fields.",
        variant: "destructive",
      });
      return;
    }

    if (!user?.schoolId) {
      toast({
        title: "Error",
        description: "School information not found. Please make sure you're logged in properly.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      console.log('Calling createGrade service...');
      const newGrade = await createGrade({
        name: formData.name,
        level: parseInt(formData.level),
        curriculum: formData.curriculum,
        schoolId: user.schoolId,
      });

      console.log('Grade created successfully:', newGrade);

      toast({
        title: "Grade created",
        description: `${formData.name} has been added successfully.`,
      });

      setIsCreateDialogOpen(false);
      setFormData({ name: "", level: "", curriculum: "cbc" });
      refetchGrades();
    } catch (error: any) {
      console.error('Failed to create grade:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to create grade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleEditGrade = async () => {
    if (!editingGrade || !formData.name || !formData.level) {
      toast({
        title: "Missing information",
        description: "Please provide all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);

    try {
      await updateGrade(editingGrade.id, {
        name: formData.name,
        level: parseInt(formData.level),
        curriculum: formData.curriculum,
      });

      toast({
        title: "Grade updated",
        description: `${formData.name} has been updated successfully.`,
      });

      setIsEditDialogOpen(false);
      setEditingGrade(null);
      setFormData({ name: "", level: "", curriculum: "cbc" });
      refetchGrades();
    } catch (error) {
      console.error('Failed to update grade:', error);
      toast({
        title: "Error",
        description: "Failed to update grade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteGrade = async () => {
    if (!gradeToDelete) return;
    
    setIsDeleting(true);

    try {
      await deleteGrade(gradeToDelete.id);

      toast({
        title: "Grade deleted",
        description: `${gradeToDelete.name} has been deleted successfully.`,
      });

      setIsDeleteDialogOpen(false);
      setGradeToDelete(null);
      refetchGrades();
    } catch (error) {
      console.error('Failed to delete grade:', error);
      toast({
        title: "Error",
        description: "Failed to delete grade. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openEditDialog = (grade: Grade) => {
    setEditingGrade(grade);
    setFormData({
      name: grade.name,
      level: grade.level.toString(),
      curriculum: grade.curriculum,
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (grade: Grade) => {
    setGradeToDelete(grade);
    setIsDeleteDialogOpen(true);
  };

  const filteredGrades = grades.filter((grade) => {
    const nameMatch = grade.name.toLowerCase().includes(search.toLowerCase());
    const curriculumMatch = curriculumFilter === "all" || grade.curriculum === curriculumFilter;
    return nameMatch && curriculumMatch;
  });

  if (gradesLoading) {
    return (
      <DashboardLayout title={terminology.gradePlural}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-school-primary mx-auto mb-2"></div>
            <p className="text-gray-500">Loading {terminology.gradePlural.toLowerCase()}...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!user?.schoolId) {
    return (
      <DashboardLayout title={terminology.gradePlural}>
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <p className="text-red-500">No school information found. Please contact support.</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title={terminology.gradePlural}>
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex flex-1 gap-2 items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search grades..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={curriculumFilter}
            onValueChange={(value) => setCurriculumFilter(value)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Curriculum" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Curricula</SelectItem>
               <SelectItem value="cbc">CBE</SelectItem>
              <SelectItem value="8-4-4">8-4-4</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add {terminology.gradeSingular}
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Curriculum</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGrades.length > 0 ? (
              filteredGrades.map((grade) => (
                <TableRow key={grade.id}>
                  <TableCell className="font-medium">{grade.name}</TableCell>
                  <TableCell>{grade.level}</TableCell>
                  <TableCell>{grade.curriculum.toUpperCase()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/grades/${grade.id}/streams`)}
                      >
                        Streams
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(grade)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openDeleteDialog(grade)}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="h-24 text-center">
                  {grades.length === 0 
                    ? `No ${terminology.gradePlural.toLowerCase()} found. Add a ${terminology.gradeSingular.toLowerCase()} to get started.` 
                    : `No ${terminology.gradePlural.toLowerCase()} match your search criteria.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Grade Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add {terminology.gradeSingular}</DialogTitle>
            <DialogDescription>Create a new {terminology.gradeSingular.toLowerCase()} for your school.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">{terminology.gradeSingular} Name</Label>
              <Input
                id="name"
                name="name"
                placeholder={curriculum === "8-4-4" ? "e.g., Form 1" : "e.g., Grade 1"}
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="level">Level</Label>
              <Input
                id="level"
                name="level"
                type="number"
                placeholder="e.g., 1 for Grade 1, 9 for Form 1"
                min="1"
                max="12"
                value={formData.level}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="curriculum">Curriculum</Label>
              <Select
                value={formData.curriculum}
                onValueChange={(value) => handleSelectChange("curriculum", value)}
              >
                <SelectTrigger id="curriculum">
                  <SelectValue placeholder="Select curriculum" />
                </SelectTrigger>
                <SelectContent>
                   <SelectItem value="cbc">CBE</SelectItem>
                  <SelectItem value="8-4-4">8-4-4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={isCreating}>
              Cancel
            </Button>
            <Button onClick={handleCreateGrade} disabled={isCreating}>
              {isCreating ? "Creating..." : `Create ${terminology.gradeSingular}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Grade Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit {terminology.gradeSingular}</DialogTitle>
            <DialogDescription>Update {terminology.gradeSingular.toLowerCase()} information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">{terminology.gradeSingular} Name</Label>
              <Input
                id="edit-name"
                name="name"
                placeholder={curriculum === "8-4-4" ? "e.g., Form 1" : "e.g., Grade 1"}
                value={formData.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-level">Level</Label>
              <Input
                id="edit-level"
                name="level"
                type="number"
                placeholder={curriculum === "8-4-4" ? "e.g., 1 for Form 1" : "e.g., 1 for Grade 1"}
                min="1"
                max="12"
                value={formData.level}
                onChange={handleInputChange}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-curriculum">Curriculum</Label>
              <Select
                value={formData.curriculum}
                onValueChange={(value) => handleSelectChange("curriculum", value)}
              >
                <SelectTrigger id="edit-curriculum">
                  <SelectValue placeholder="Select curriculum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cbc">CBE</SelectItem>
                  <SelectItem value="8-4-4">8-4-4</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={isUpdating}>
              Cancel
            </Button>
            <Button onClick={handleEditGrade} disabled={isUpdating}>
              {isUpdating ? "Updating..." : `Update ${terminology.gradeSingular}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {gradeToDelete?.name}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteGrade} disabled={isDeleting}>
              {isDeleting ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default Grades;
