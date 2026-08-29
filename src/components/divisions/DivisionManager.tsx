import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Pencil, Trash2, Building2, GraduationCap, Users, BookOpen, Calendar } from "lucide-react";
import { toast } from "sonner";
import { useDivisions } from "@/hooks/useDivisions";
import { SchoolDivision, updateDivision, deleteDivision, getDivisionDisplayName } from "@/services/divisionService";

export const DivisionManager = () => {
  const { divisions, loading, refetch, initializeDivisions, hasDivisions } = useDivisions();
  const [editingDivision, setEditingDivision] = useState<SchoolDivision | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingDivision, setDeletingDivision] = useState<SchoolDivision | null>(null);
  const [saving, setSaving] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editShortName, setEditShortName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const handleInitialize = async () => {
    try {
      await initializeDivisions();
      toast.success("School divisions initialized successfully");
    } catch (error) {
      toast.error("Failed to initialize divisions");
    }
  };

  const handleEdit = (division: SchoolDivision) => {
    setEditingDivision(division);
    setEditName(division.name);
    setEditShortName(division.short_name || "");
    setEditDescription(division.description || "");
    setEditDialogOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingDivision) return;

    try {
      setSaving(true);
      await updateDivision(editingDivision.id, {
        name: editName,
        short_name: editShortName || null,
        description: editDescription || null,
      });
      toast.success("Division updated successfully");
      setEditDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to update division");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (division: SchoolDivision) => {
    setDeletingDivision(division);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingDivision) return;

    try {
      setSaving(true);
      await deleteDivision(deletingDivision.id);
      toast.success("Division deleted successfully");
      setDeleteDialogOpen(false);
      refetch();
    } catch (error) {
      toast.error("Failed to delete division");
    } finally {
      setSaving(false);
    }
  };

  const getDivisionIcon = (divisionType: string) => {
    switch (divisionType) {
      case "lower_primary":
        return <GraduationCap className="h-5 w-5" />;
      case "upper_primary":
        return <BookOpen className="h-5 w-5" />;
      case "junior_secondary":
        return <Users className="h-5 w-5" />;
      case "senior_secondary":
        return <Building2 className="h-5 w-5" />;
      case "8-4-4":
        return <Calendar className="h-5 w-5" />;
      default:
        return <Building2 className="h-5 w-5" />;
    }
  };

  const getCurriculumBadge = (curriculum: string) => {
    switch (curriculum) {
       case "cbc":
         return <Badge variant="secondary">CBE</Badge>;
       case "cbc-senior":
         return <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">CBE Senior</Badge>;
      case "8-4-4":
        return <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">8-4-4</Badge>;
      default:
        return <Badge variant="outline">{curriculum}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!hasDivisions) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Divisions
          </CardTitle>
          <CardDescription>
            Divisions help organize your school into distinct sections (e.g., Lower Primary, Upper Primary, Junior Secondary)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Divisions Configured</h3>
            <p className="text-muted-foreground mb-4">
              Initialize default divisions based on your school's curriculum to get started.
            </p>
            <Button onClick={handleInitialize}>
              Initialize Default Divisions
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            School Divisions
          </CardTitle>
          <CardDescription>
            Manage your school's divisions. Each division can have its own timetable, subjects, and teacher assignments.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {divisions.map((division) => (
              <Card key={division.id} className="relative">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary">
                        {getDivisionIcon(division.division_type)}
                      </div>
                      <div>
                        <CardTitle className="text-base">{division.name}</CardTitle>
                        {division.short_name && (
                          <span className="text-xs text-muted-foreground">{division.short_name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEdit(division)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => handleDelete(division)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-2">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {getCurriculumBadge(division.curriculum)}
                      <Badge variant="outline">
                        {division.curriculum === "8-4-4" 
                          ? `Form ${division.grade_level_start}-${division.grade_level_end}`
                          : `Grade ${division.grade_level_start}-${division.grade_level_end}`}
                      </Badge>
                    </div>
                    {division.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {division.description}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Division</DialogTitle>
            <DialogDescription>
              Customize the division name and description.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Division Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., Lower Primary"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Short Name</Label>
              <Input
                id="shortName"
                value={editShortName}
                onChange={(e) => setEditShortName(e.target.value)}
                placeholder="e.g., LP"
                maxLength={5}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Brief description of this division..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} disabled={saving || !editName.trim()}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Division</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingDivision?.name}"? This action cannot be undone.
              Grades, teachers, and subjects assigned to this division will need to be reassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={saving}>
              {saving ? "Deleting..." : "Delete Division"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DivisionManager;
