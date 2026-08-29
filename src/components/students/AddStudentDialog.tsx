
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getSchoolStreamGradeCombinations } from "@/services/academicService";
import { useAuth } from "@/contexts/AuthContext";
import { cbcSeniorPathways, requiresPathway, CBCSeniorPathway } from "@/services/curriculumService";
import { getTracksByPathway, type CBCSeniorTrack } from "@/services/trackService";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface StreamGradeCombination {
  id: string;
  gradeId: string;
  streamId: string;
  gradeName: string;
  gradeLevel: number;
  gradeCurriculum: string;
  streamName: string;
  displayName: string;
  teacherId?: string;
}

interface AddStudentDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAddStudent: (student: {
    admissionNo: string;
    name: string;
    email: string;
    gradeId: string;
    streamId: string;
    pathway?: string;
    trackId?: string;
  }) => void;
}

const AddStudentDialog = ({
  isOpen,
  onOpenChange,
  onAddStudent,
}: AddStudentDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [newStudent, setNewStudent] = useState({
    admissionNo: "",
    name: "",
    gradeId: "",
    streamId: "",
    pathway: "" as string,
    trackId: "" as string,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [streamGradeCombinations, setStreamGradeCombinations] = useState<StreamGradeCombination[]>([]);
  const [isLoadingCombinations, setIsLoadingCombinations] = useState(false);
  const [tracks, setTracks] = useState<CBCSeniorTrack[]>([]);
  const [isLoadingTracks, setIsLoadingTracks] = useState(false);

  useEffect(() => {
    if (isOpen && user?.schoolId) {
      loadStreamGradeCombinations();
    }
  }, [isOpen, user?.schoolId]);

  const loadStreamGradeCombinations = async () => {
    if (!user?.schoolId) {
      console.log('No schoolId available for loading combinations');
      return;
    }
    
    console.log('Loading stream-grade combinations for school:', user.schoolId);
    setIsLoadingCombinations(true);
    try {
      const combinations = await getSchoolStreamGradeCombinations(user.schoolId);
      console.log('Loaded combinations:', combinations);
      setStreamGradeCombinations(combinations);
    } catch (error) {
      console.error('Error loading stream-grade combinations:', error);
      toast({
        title: "Error",
        description: "Failed to load streams and grades",
        variant: "destructive",
      });
    } finally {
      setIsLoadingCombinations(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewStudent(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleStreamGradeSelection = (combinationId: string) => {
    const combination = streamGradeCombinations.find(c => c.id === combinationId);
    if (combination) {
      setNewStudent(prev => ({
        ...prev,
        gradeId: combination.gradeId,
        streamId: combination.streamId,
        // Clear pathway and track if switching to non-CBE Senior grade
        pathway: requiresPathway(combination.gradeName) ? prev.pathway : "",
        trackId: requiresPathway(combination.gradeName) ? prev.trackId : "",
      }));
    }
  };

  const selectedCombination = streamGradeCombinations.find(
    c => c.gradeId === newStudent.gradeId && c.streamId === newStudent.streamId
  );

  const showPathwaySelect = selectedCombination && requiresPathway(selectedCombination.gradeName);

  // Load tracks when pathway changes
  useEffect(() => {
    if (showPathwaySelect && newStudent.pathway && user?.schoolId) {
      loadTracks(newStudent.pathway as CBCSeniorPathway);
    } else {
      setTracks([]);
      setNewStudent(prev => ({ ...prev, trackId: "" }));
    }
  }, [newStudent.pathway, showPathwaySelect, user?.schoolId]);

  const loadTracks = async (pathway: CBCSeniorPathway) => {
    if (!user?.schoolId) return;
    
    setIsLoadingTracks(true);
    try {
      const pathwayTracks = await getTracksByPathway(user.schoolId, pathway);
      setTracks(pathwayTracks);
    } catch (error) {
      console.error('Error loading tracks:', error);
      setTracks([]);
    } finally {
      setIsLoadingTracks(false);
    }
  };

  const handleAddStudent = () => {
    setIsSubmitting(true);
    
    if (!newStudent.admissionNo || !newStudent.name || !newStudent.gradeId || !newStudent.streamId) {
      toast({
        title: "Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

     // Validate pathway for CBE Senior students
     if (showPathwaySelect && !newStudent.pathway) {
       toast({
         title: "Error",
         description: "Please select a pathway for CBE Senior students",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    // Validate track for CBE Senior students (if tracks are available)
    if (showPathwaySelect && tracks.length > 0 && !newStudent.trackId) {
      toast({
        title: "Error",
        description: "Please select a track for this student",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }
    
    onAddStudent({ 
      ...newStudent, 
      email: "",
      pathway: showPathwaySelect ? newStudent.pathway : undefined,
      trackId: showPathwaySelect && newStudent.trackId ? newStudent.trackId : undefined,
    });
    
    // Reset form
    setNewStudent({
      admissionNo: "",
      name: "",
      gradeId: "",
      streamId: "",
      pathway: "",
      trackId: "",
    });
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Student</DialogTitle>
          <DialogDescription>
            Fill in the student details. Fields marked with * are required.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="admissionNo" className="text-right">
              Admission No *
            </Label>
            <Input
              id="admissionNo"
              name="admissionNo"
              value={newStudent.admissionNo}
              onChange={handleInputChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Full Name *
            </Label>
            <Input
              id="name"
              name="name"
              value={newStudent.name}
              onChange={handleInputChange}
              className="col-span-3"
              required
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="streamGrade" className="text-right">
              Grade & Stream *
            </Label>
            <Select
              value={selectedCombination?.id || ""}
              onValueChange={handleStreamGradeSelection}
              disabled={isLoadingCombinations}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder={isLoadingCombinations ? "Loading..." : "Select Grade & Stream"} />
              </SelectTrigger>
              <SelectContent>
                {streamGradeCombinations.map((combination) => (
                  <SelectItem key={combination.id} value={combination.id}>
                    {combination.displayName}
                    {requiresPathway(combination.gradeName) && (
                      <Badge variant="outline" className="ml-2 text-xs">CBE Senior</Badge>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {showPathwaySelect && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="pathway" className="text-right pt-2">
                Pathway *
              </Label>
              <div className="col-span-3 space-y-2">
                <Select
                  value={newStudent.pathway}
                  onValueChange={(value) => setNewStudent(prev => ({ ...prev, pathway: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Pathway" />
                  </SelectTrigger>
                  <SelectContent>
                    {cbcSeniorPathways.map((pathway) => (
                      <SelectItem key={pathway.value} value={pathway.value}>
                        <div className="flex flex-col">
                          <span>{pathway.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {newStudent.pathway && (
                  <p className="text-xs text-muted-foreground">
                    {cbcSeniorPathways.find(p => p.value === newStudent.pathway)?.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Track Selection for CBE Senior */}
          {showPathwaySelect && newStudent.pathway && (
            <div className="grid grid-cols-4 items-start gap-4">
              <Label htmlFor="track" className="text-right pt-2">
                Track {tracks.length > 0 ? "*" : "(optional)"}
              </Label>
              <div className="col-span-3 space-y-2">
                {isLoadingTracks ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading tracks...
                  </div>
                ) : tracks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No tracks configured for this pathway. Configure tracks in Subject Management.
                  </p>
                ) : (
                  <Select
                    value={newStudent.trackId}
                    onValueChange={(value) => setNewStudent(prev => ({ ...prev, trackId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Track" />
                    </SelectTrigger>
                    <SelectContent>
                      {tracks.map((track) => (
                        <SelectItem key={track.id} value={track.id}>
                          <div className="flex flex-col">
                            <span>{track.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button 
            className="bg-school-primary hover:bg-school-secondary"
            onClick={handleAddStudent}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Adding..." : "Add Student"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddStudentDialog;
