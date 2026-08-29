import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useDivisions } from "@/hooks/useDivisions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Route,
  Plus,
  Trash2,
  Edit,
  Loader2,
  Info,
  GraduationCap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  getTracksWithSubjects,
  createTrack,
  updateTrack,
  deleteTrack,
  type TrackWithSubjects,
} from "@/services/trackService";
import { cbcSeniorPathways, type CBCSeniorPathway } from "@/services/curriculumService";

interface CBCSeniorTrackManagerProps {
  readOnly?: boolean;
}

interface SubjectOption {
  id: string;
  name: string;
  pathway: string | null;
  subject_type: string;
}

export function CBCSeniorTrackManager({ readOnly = false }: CBCSeniorTrackManagerProps) {
  const { user } = useAuth();
  const { divisions } = useDivisions();
  const [tracks, setTracks] = useState<TrackWithSubjects[]>([]);
  const [subjects, setSubjects] = useState<SubjectOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePathway, setActivePathway] = useState<CBCSeniorPathway>("stem");

  // Dialog states
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTrack, setEditingTrack] = useState<TrackWithSubjects | null>(null);

  // Form states
  const [trackName, setTrackName] = useState("");
  const [trackDescription, setTrackDescription] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);

   // Check if school has CBE Senior division
   const cbcSeniorDivision = divisions.find((d) => d.curriculum === "cbc-senior");

  useEffect(() => {
    if (user?.schoolId && cbcSeniorDivision) {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [user?.schoolId, cbcSeniorDivision]);

  const fetchData = async () => {
    if (!user?.schoolId || !cbcSeniorDivision) return;

    try {
      setLoading(true);

      // Fetch tracks
      const tracksData = await getTracksWithSubjects(user.schoolId);
      setTracks(tracksData);

      // Fetch CBE Senior optional subjects from the division
      const { data: subjectsData, error } = await supabase
        .from("subjects")
        .select("id, name, pathway, subject_type")
        .eq("school_id", user.schoolId)
        .eq("division_id", cbcSeniorDivision.id)
        .eq("is_active", true)
        .neq("subject_type", "core")
        .order("name");

      if (error) throw error;
      setSubjects(subjectsData || []);
    } catch (error) {
      console.error("Error fetching track data:", error);
      toast({
        title: "Error",
        description: "Failed to load track data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddTrack = async () => {
    if (!user?.schoolId || !trackName.trim() || selectedSubjects.length === 0) {
      toast({
        title: "Error",
        description: "Please provide a track name and select at least one subject",
        variant: "destructive",
      });
      return;
    }

    try {
      await createTrack(
        user.schoolId,
        activePathway,
        trackName.trim(),
        selectedSubjects,
        trackDescription.trim() || undefined
      );

      toast({ title: "Track Created", description: `${trackName} has been created.` });
      resetForm();
      setShowAddDialog(false);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create track",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTrack = async () => {
    if (!editingTrack || !trackName.trim() || selectedSubjects.length === 0) {
      toast({
        title: "Error",
        description: "Please provide a track name and select at least one subject",
        variant: "destructive",
      });
      return;
    }

    try {
      await updateTrack(editingTrack.id, {
        name: trackName.trim(),
        description: trackDescription.trim() || null,
        subject_ids: selectedSubjects,
      });

      toast({ title: "Track Updated" });
      resetForm();
      setEditingTrack(null);
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update track",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTrack = async (track: TrackWithSubjects) => {
    if (!confirm(`Are you sure you want to delete "${track.name}"?`)) return;

    try {
      await deleteTrack(track.id);
      toast({ title: "Track Deleted" });
      fetchData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete track",
        variant: "destructive",
      });
    }
  };

  const openEditDialog = (track: TrackWithSubjects) => {
    setEditingTrack(track);
    setTrackName(track.name);
    setTrackDescription(track.description || "");
    setSelectedSubjects(track.subject_ids);
    setActivePathway(track.pathway);
  };

  const resetForm = () => {
    setTrackName("");
    setTrackDescription("");
    setSelectedSubjects([]);
  };

  const getSubjectsForPathway = (pathway: CBCSeniorPathway) => {
    return subjects.filter((s) => s.pathway === pathway);
  };

  const getSubjectsFromOtherPathways = (pathway: CBCSeniorPathway) => {
    return subjects.filter((s) => s.pathway && s.pathway !== pathway);
  };

  const getTracksForPathway = (pathway: CBCSeniorPathway) => {
    return tracks.filter((t) => t.pathway === pathway);
  };

  const getPathwayLabel = (pathway: CBCSeniorPathway) => {
    return cbcSeniorPathways.find((p) => p.value === pathway)?.label || pathway;
  };

  const getPathwayDescription = (pathway: CBCSeniorPathway) => {
    return cbcSeniorPathways.find((p) => p.value === pathway)?.description || "";
  };

  if (!cbcSeniorDivision) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
           CBE Senior track configuration is only available for schools with CBE Senior Secondary
           curriculum. Set up a CBE Senior division first.
        </AlertDescription>
      </Alert>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Route className="h-5 w-5" />
            CBE Senior Subject Tracks
          </h3>
          <p className="text-sm text-muted-foreground">
            Configure subject combinations (tracks) for each pathway. Students choose a track
            within their pathway.
          </p>
        </div>
        {!readOnly && (
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Track
          </Button>
        )}
      </div>

      <Tabs value={activePathway} onValueChange={(v) => setActivePathway(v as CBCSeniorPathway)}>
        <TabsList>
          {cbcSeniorPathways.map((pathway) => (
            <TabsTrigger key={pathway.value} value={pathway.value}>
              {pathway.label} ({getTracksForPathway(pathway.value).length})
            </TabsTrigger>
          ))}
        </TabsList>

        {cbcSeniorPathways.map((pathway) => (
          <TabsContent key={pathway.value} value={pathway.value}>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  {pathway.label} Tracks
                </CardTitle>
                <CardDescription>{pathway.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {getTracksForPathway(pathway.value).length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Route className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No tracks configured for {pathway.label}</p>
                    {!readOnly && (
                      <Button
                        variant="link"
                        className="mt-2"
                        onClick={() => {
                          setActivePathway(pathway.value);
                          setShowAddDialog(true);
                        }}
                      >
                        Create first track
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    {getTracksForPathway(pathway.value).map((track) => (
                      <div
                        key={track.id}
                        className="p-4 border rounded-lg bg-muted/30 space-y-2"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-semibold">{track.name}</h4>
                            {track.description && (
                              <p className="text-sm text-muted-foreground">{track.description}</p>
                            )}
                          </div>
                          {!readOnly && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => openEditDialog(track)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-destructive hover:text-destructive"
                                onClick={() => handleDeleteTrack(track)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {track.subjects.map((subject) => {
                            const subjectData = subjects.find(s => s.id === subject.id);
                            const isCrossPathway = subjectData && subjectData.pathway !== track.pathway;
                            return (
                              <Badge key={subject.id} variant={isCrossPathway ? "outline" : "secondary"}>
                                {subject.name}
                                {isCrossPathway && (
                                  <span className="ml-1 text-xs opacity-70">({subjectData.pathway})</span>
                                )}
                              </Badge>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Add/Edit Track Dialog */}
      <Dialog
        open={showAddDialog || !!editingTrack}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddDialog(false);
            setEditingTrack(null);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTrack ? "Edit Track" : "Create New Track"}
            </DialogTitle>
            <DialogDescription>
              Configure a subject combination for {getPathwayLabel(activePathway)} pathway.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Track Name</label>
              <Input
                placeholder="e.g., Track A - Biology/Chemistry/Physics"
                value={trackName}
                onChange={(e) => setTrackName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Description (Optional)</label>
              <Textarea
                placeholder="Brief description of this track..."
                value={trackDescription}
                onChange={(e) => setTrackDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Select Subjects ({selectedSubjects.length} selected)
              </label>
              <ScrollArea className="h-[280px] border rounded-md p-3">
                {getSubjectsForPathway(activePathway).length === 0 && getSubjectsFromOtherPathways(activePathway).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No optional subjects available. Add CBE Senior subjects first.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {/* Pathway's own subjects */}
                    {getSubjectsForPathway(activePathway).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                          {getPathwayLabel(activePathway)} Subjects
                        </p>
                        {getSubjectsForPathway(activePathway).map((subject) => (
                          <div key={subject.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={subject.id}
                              checked={selectedSubjects.includes(subject.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSubjects([...selectedSubjects, subject.id]);
                                } else {
                                  setSelectedSubjects(selectedSubjects.filter((id) => id !== subject.id));
                                }
                              }}
                            />
                            <label htmlFor={subject.id} className="text-sm cursor-pointer flex-1">
                              {subject.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Cross-pathway subjects */}
                    {getSubjectsFromOtherPathways(activePathway).length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide border-t pt-3">
                          From Other Pathways
                        </p>
                        {getSubjectsFromOtherPathways(activePathway).map((subject) => (
                          <div key={subject.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`cross-${subject.id}`}
                              checked={selectedSubjects.includes(subject.id)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedSubjects([...selectedSubjects, subject.id]);
                                } else {
                                  setSelectedSubjects(selectedSubjects.filter((id) => id !== subject.id));
                                }
                              }}
                            />
                            <label htmlFor={`cross-${subject.id}`} className="text-sm cursor-pointer flex-1">
                              {subject.name}
                            </label>
                            <Badge variant="outline" className="text-xs">
                              {subject.pathway}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowAddDialog(false);
                setEditingTrack(null);
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={editingTrack ? handleUpdateTrack : handleAddTrack}
              disabled={!trackName.trim() || selectedSubjects.length === 0}
            >
              {editingTrack ? "Update Track" : "Create Track"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
