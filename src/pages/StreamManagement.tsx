import { useState, useEffect } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Plus, Edit, Trash2, Users, Building2, GraduationCap, Globe, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  StreamLevel,
  getStreamsByLevel,
  createStreamAtLevel,
  updateStreamAtLevel,
  deleteStreamAtLevel,
  enableDivisionOverride,
  enableGradeOverride,
} from "@/services/streamService";

interface StreamRow {
  id: string;
  name: string;
  school_id: string;
  grade_id: string | null;
  division_id: string | null;
  override_level: StreamLevel;
  created_at: string;
}

interface Division {
  id: string;
  name: string;
  curriculum: string;
  grade_level_start: number;
  grade_level_end: number;
}

interface Grade {
  id: string;
  name: string;
  level: number;
  division_id: string | null;
}

const StreamManagement = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  // Tab state
  const [activeTab, setActiveTab] = useState<StreamLevel>("school");

  // Data
  const [streams, setStreams] = useState<StreamRow[]>([]);
  const [divisions, setDivisions] = useState<Division[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedDivisionId, setSelectedDivisionId] = useState<string>("");
  const [selectedGradeId, setSelectedGradeId] = useState<string>("");

  // Dialog state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingStream, setEditingStream] = useState<StreamRow | null>(null);
  const [deletingStream, setDeletingStream] = useState<StreamRow | null>(null);
  const [streamName, setStreamName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user?.schoolId) {
      loadDivisionsAndGrades();
    }
  }, [user?.schoolId]);

  useEffect(() => {
    if (user?.schoolId) {
      loadStreams();
    }
  }, [user?.schoolId, activeTab, selectedDivisionId, selectedGradeId]);

  const loadDivisionsAndGrades = async () => {
    if (!user?.schoolId) return;
    const [{ data: divData }, { data: gradeData }] = await Promise.all([
      supabase.from("school_divisions").select("id, name, curriculum, grade_level_start, grade_level_end").eq("school_id", user.schoolId).order("display_order"),
      supabase.from("grades").select("id, name, level, division_id").eq("school_id", user.schoolId).order("level"),
    ]);
    setDivisions(divData || []);
    setGrades(gradeData || []);
  };

  const loadStreams = async () => {
    if (!user?.schoolId) return;
    try {
      setLoading(true);
      const targetId = activeTab === 'division' ? selectedDivisionId : activeTab === 'grade' ? selectedGradeId : undefined;
      if ((activeTab === 'division' && !selectedDivisionId) || (activeTab === 'grade' && !selectedGradeId)) {
        setStreams([]);
        setLoading(false);
        return;
      }
      const data = await getStreamsByLevel(user.schoolId, activeTab, targetId);
      setStreams(data);
    } catch (error) {
      console.error("Error loading streams:", error);
      toast({ title: "Error", description: "Failed to load streams", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!streamName.trim() || !user?.schoolId) return;

    setIsSubmitting(true);
    try {
      await createStreamAtLevel({
        name: streamName,
        schoolId: user.schoolId,
        level: activeTab,
        divisionId: activeTab === 'division' ? selectedDivisionId : undefined,
        gradeId: activeTab === 'grade' ? selectedGradeId : undefined,
      });

      // If creating first division/grade stream, trigger override
      if (activeTab === 'division' && selectedDivisionId) {
        await enableDivisionOverride(user.schoolId, selectedDivisionId);
      } else if (activeTab === 'grade' && selectedGradeId) {
        await enableGradeOverride(user.schoolId, selectedGradeId);
      }

      toast({ title: "Stream Created", description: `${streamName} created at ${activeTab} level` });
      setIsCreateDialogOpen(false);
      setStreamName("");
      loadStreams();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to create stream", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdate = async () => {
    if (!streamName.trim() || !editingStream) return;
    setIsSubmitting(true);
    try {
      await updateStreamAtLevel(editingStream.id, streamName);
      toast({ title: "Stream Updated", description: `Stream renamed to ${streamName}` });
      setIsEditDialogOpen(false);
      setEditingStream(null);
      setStreamName("");
      loadStreams();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to update stream", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingStream) return;
    setIsSubmitting(true);
    try {
      await deleteStreamAtLevel(deletingStream.id);
      toast({ title: "Stream Deleted", description: `${deletingStream.name} has been deleted` });
      setIsDeleteDialogOpen(false);
      setDeletingStream(null);
      loadStreams();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to delete stream", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLevelDescription = () => {
    switch (activeTab) {
      case 'school': return "School-wide streams apply to all grades by default. They can be overridden at division or grade level.";
      case 'division': return "Division-level streams override school-wide streams for all grades within the selected division. Individual grades can still override these.";
      case 'grade': return "Grade-level streams override both school-wide and division-level streams for this specific grade only.";
    }
  };

  const getLevelIcon = () => {
    switch (activeTab) {
      case 'school': return <Globe className="h-5 w-5" />;
      case 'division': return <Building2 className="h-5 w-5" />;
      case 'grade': return <GraduationCap className="h-5 w-5" />;
    }
  };

  const canCreate = () => {
    if (activeTab === 'school') return true;
    if (activeTab === 'division') return !!selectedDivisionId;
    if (activeTab === 'grade') return !!selectedGradeId;
    return false;
  };

  const filteredGradesForDivision = selectedDivisionId
    ? grades.filter(g => g.division_id === selectedDivisionId)
    : grades;

  const renderStreamTable = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2" />
            <p className="text-muted-foreground">Loading streams...</p>
          </div>
        </div>
      );
    }

    if ((activeTab === 'division' && !selectedDivisionId) || (activeTab === 'grade' && !selectedGradeId)) {
      return (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Info className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground">
            {activeTab === 'division' ? "Select a division to manage its streams" : "Select a grade to manage its streams"}
          </p>
        </div>
      );
    }

    if (streams.length === 0) {
      return (
        <div className="text-center py-8 border border-dashed rounded-lg">
          <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Streams at This Level</h3>
          <p className="text-muted-foreground mb-4">
            {activeTab === 'school'
              ? "Create school-wide streams that apply to all grades by default."
              : activeTab === 'division'
              ? "Create division-level streams to override school-wide defaults for this division."
              : "Create grade-level streams to override defaults for this specific grade."}
          </p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Stream
          </Button>
        </div>
      );
    }

    return (
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Stream Name</TableHead>
              <TableHead>Level</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {streams.map((stream) => (
              <TableRow key={stream.id}>
                <TableCell className="font-medium">{stream.name}</TableCell>
                <TableCell>
                  <Badge variant={stream.override_level === 'school' ? 'secondary' : stream.override_level === 'division' ? 'outline' : 'default'}>
                    {stream.override_level === 'school' ? 'School-wide' : stream.override_level === 'division' ? 'Division' : 'Grade'}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => { setEditingStream(stream); setStreamName(stream.name); setIsEditDialogOpen(true); }}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => { setDeletingStream(stream); setIsDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <DashboardLayout title="Stream Management">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center gap-2">
            {getLevelIcon()}
            <div>
              <CardTitle>Stream Management</CardTitle>
              <CardDescription>
                Create and manage streams at different levels. Lower levels override higher levels.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as StreamLevel)}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="school" className="flex items-center gap-1.5">
                <Globe className="h-4 w-4" />
                School-wide
              </TabsTrigger>
              <TabsTrigger value="division" className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4" />
                Division
              </TabsTrigger>
              <TabsTrigger value="grade" className="flex items-center gap-1.5">
                <GraduationCap className="h-4 w-4" />
                Grade
              </TabsTrigger>
            </TabsList>

            <Alert className="mb-4">
              <Info className="h-4 w-4" />
              <AlertDescription>{getLevelDescription()}</AlertDescription>
            </Alert>

            <TabsContent value="school" className="mt-0">
              <div className="flex justify-end mb-4">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add School-wide Stream
                </Button>
              </div>
              {renderStreamTable()}
            </TabsContent>

            <TabsContent value="division" className="mt-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="w-full sm:w-64">
                  <Label className="mb-1.5 block text-sm">Select Division</Label>
                  <Select value={selectedDivisionId} onValueChange={setSelectedDivisionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a division..." />
                    </SelectTrigger>
                    <SelectContent>
                      {divisions.map((div) => (
                        <SelectItem key={div.id} value={div.id}>{div.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canCreate() && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Division Stream
                  </Button>
                )}
              </div>
              {renderStreamTable()}
            </TabsContent>

            <TabsContent value="grade" className="mt-0">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <div className="w-full sm:w-64">
                  <Label className="mb-1.5 block text-sm">Select Grade</Label>
                  <Select value={selectedGradeId} onValueChange={setSelectedGradeId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a grade..." />
                    </SelectTrigger>
                    <SelectContent>
                      {grades.map((grade) => (
                        <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {canCreate() && (
                  <Button onClick={() => setIsCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Grade Stream
                  </Button>
                )}
              </div>
              {renderStreamTable()}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Override hierarchy info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Override Hierarchy</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="secondary">School-wide</Badge>
            <span>→ overridden by →</span>
            <Badge variant="outline">Division</Badge>
            <span>→ overridden by →</span>
            <Badge>Grade</Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            When you create streams at a lower level, they automatically replace the inherited streams for that scope. 
            Grades without overrides continue using the next level up.
          </p>
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Create {activeTab === 'school' ? 'School-wide' : activeTab === 'division' ? 'Division' : 'Grade'} Stream
            </DialogTitle>
            <DialogDescription>
              {activeTab === 'school' && "This stream will apply to all grades unless overridden."}
              {activeTab === 'division' && "This stream will override school-wide streams for grades in this division."}
              {activeTab === 'grade' && "This stream will override all other streams for this specific grade."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stream-name">Stream Name</Label>
              <Input
                id="stream-name"
                placeholder="e.g., Stream A, Blue, North"
                value={streamName}
                onChange={(e) => setStreamName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isSubmitting) handleCreate(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsCreateDialogOpen(false); setStreamName(""); }} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleCreate} disabled={isSubmitting || !streamName.trim()}>{isSubmitting ? "Creating..." : "Create Stream"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Stream</DialogTitle>
            <DialogDescription>Update the stream name.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-stream-name">Stream Name</Label>
              <Input
                id="edit-stream-name"
                value={streamName}
                onChange={(e) => setStreamName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !isSubmitting) handleUpdate(); }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingStream(null); setStreamName(""); }} disabled={isSubmitting}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={isSubmitting || !streamName.trim()}>{isSubmitting ? "Updating..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{deletingStream?.name}"? Students assigned to this stream will need to be reassigned.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsDeleteDialogOpen(false); setDeletingStream(null); }} disabled={isSubmitting}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isSubmitting}>{isSubmitting ? "Deleting..." : "Delete"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default StreamManagement;
