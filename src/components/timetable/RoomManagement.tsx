import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { PlusCircle, Edit, Trash2, Wand2, Loader2, Building2, Users } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface Room {
  id: string;
  name: string;
  capacity?: number;
  roomType: string;
  schoolId: string;
  gradeId?: string;
  streamId?: string;
  gradeName?: string;
  streamName?: string;
  trackId?: string;
  trackName?: string;
  trackIds?: string[];
  roomMode?: 'standard' | 'full' | 'split';
}

type RoomManagementProps = {
  rooms: Room[];
  onCreateRoom: (room: Omit<Room, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onUpdateRoom: (id: string, room: Partial<Room>) => Promise<void>;
  onDeleteRoom: (id: string) => Promise<void>;
  onGenerateFromStreams?: () => Promise<{ created: number; skipped: number }>;
  schoolId: string;
};

export const RoomManagement: React.FC<RoomManagementProps> = ({
  rooms,
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  onGenerateFromStreams,
  schoolId,
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateResult, setGenerateResult] = useState<{ created: number; skipped: number } | null>(null);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [filterGradeId, setFilterGradeId] = useState<string>("all");

  // Form states
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState<number | undefined>(undefined);
  const [roomType, setRoomType] = useState("CLASSROOM");
  const [gradeId, setGradeId] = useState<string>("");
  const [streamId, setStreamId] = useState<string>("");
  const [selectedTrackIds, setSelectedTrackIds] = useState<string[]>([]);
  const [roomMode, setRoomMode] = useState<'standard' | 'full' | 'split'>('standard');

  const roomTypes = ["CLASSROOM", "LAB", "LIBRARY", "GYM", "AUDITORIUM", "COMPUTER_LAB", "OTHER"];

  // Fetch grades for linking
  const { data: grades = [] } = useQuery({
    queryKey: ["grades", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grades")
        .select("id, name, curriculum")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("level");
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId,
  });

  // Fetch streams for selected grade
  const { data: streams = [] } = useQuery({
    queryKey: ["streamsForGrade", schoolId, gradeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("grade_streams")
        .select(`stream_id, streams!inner(id, name)`)
        .eq("grade_id", gradeId);
      if (error) throw error;
      return (data || []).map((gs: any) => ({ id: gs.streams.id, name: gs.streams.name }));
    },
    enabled: !!gradeId,
  });

  // Check if the selected grade is CBE Senior
  const selectedGrade = grades.find((g: any) => g.id === gradeId);
  const isCBESenior = selectedGrade?.curriculum === "cbc-senior";

  // Fetch tracks for CBE Senior
  const { data: tracks = [] } = useQuery({
    queryKey: ["tracks-for-rooms", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cbc_senior_tracks")
        .select("id, name, pathway, subject_ids")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("pathway")
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && isCBESenior,
  });

  // Fetch subjects to resolve track subject names
  const { data: trackSubjects = [] } = useQuery({
    queryKey: ["subjects-for-track-labels", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("school_id", schoolId)
        .eq("curriculum", "cbc-senior")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && isCBESenior,
  });

  // Fetch student counts per track for the selected grade (form use)
  const { data: trackStudentCounts = {} } = useQuery({
    queryKey: ["track-student-counts", schoolId, gradeId],
    queryFn: async () => {
      if (!gradeId) return {};
      const { data, error } = await supabase
        .from("students")
        .select("track_id")
        .eq("school_id", schoolId)
        .eq("grade_id", gradeId)
        .eq("status", "active")
        .not("track_id", "is", null);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        counts[s.track_id] = (counts[s.track_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!gradeId && isCBESenior,
  });

  // Check if any grade is CBE Senior (for table display)
  const hasCBESeniorGrades = grades.some((g: any) => g.curriculum === "cbc-senior");

  // Fetch ALL tracks for table display
  const { data: allTracks = [] } = useQuery({
    queryKey: ["all-tracks-for-rooms", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cbc_senior_tracks")
        .select("id, name, pathway, subject_ids")
        .eq("school_id", schoolId)
        .eq("is_active", true)
        .order("pathway")
        .order("display_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && hasCBESeniorGrades,
  });

  // Fetch ALL subjects for the school (for resolving subject names in table)
  const { data: allSubjects = [] } = useQuery({
    queryKey: ["all-subjects-for-room-counts", schoolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name")
        .eq("school_id", schoolId)
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
    enabled: !!schoolId && hasCBESeniorGrades,
  });

  // Fetch student counts per track across ALL CBE senior grades (for table)
  const { data: allTrackStudentCounts = {} } = useQuery({
    queryKey: ["all-track-student-counts", schoolId],
    queryFn: async () => {
      const cbeSeniorGradeIds = grades.filter((g: any) => g.curriculum === "cbc-senior").map((g: any) => g.id);
      if (cbeSeniorGradeIds.length === 0) return {};
      const { data, error } = await supabase
        .from("students")
        .select("track_id, grade_id")
        .eq("school_id", schoolId)
        .eq("status", "active")
        .in("grade_id", cbeSeniorGradeIds)
        .not("track_id", "is", null);
      if (error) throw error;
      // Key: "gradeId:trackId" -> count
      const counts: Record<string, number> = {};
      (data || []).forEach((s: any) => {
        const key = `${s.grade_id}:${s.track_id}`;
        counts[key] = (counts[key] || 0) + 1;
        // Also store just trackId for rooms without gradeId
        counts[s.track_id] = (counts[s.track_id] || 0) + 1;
      });
      return counts;
    },
    enabled: !!schoolId && hasCBESeniorGrades && grades.length > 0,
  });

  // Helper: get student counts for a room's tracks
  const getRoomStudentBreakdown = (room: Room) => {
    const tIds = room.trackIds || (room.trackId ? [room.trackId] : []);
    if (tIds.length === 0) return null;

    const trackBreakdown = tIds.map(tId => {
      const track = allTracks.find((t: any) => t.id === tId);
      const key = room.gradeId ? `${room.gradeId}:${tId}` : tId;
      const count = (allTrackStudentCounts as Record<string, number>)[key] || 0;
      return { trackId: tId, trackName: track?.name || "Unknown", count, subjectIds: track?.subject_ids || [] };
    });

    // Per-subject breakdown: count students per subject across tracks in this room
    const subjectCounts: Record<string, { name: string; count: number }> = {};
    trackBreakdown.forEach(tb => {
      tb.subjectIds.forEach((sid: string) => {
        const subj = allSubjects.find((s: any) => s.id === sid);
        if (subj) {
          if (!subjectCounts[sid]) subjectCounts[sid] = { name: subj.name, count: 0 };
          subjectCounts[sid].count += tb.count;
        }
      });
    });

    const totalStudents = trackBreakdown.reduce((sum, tb) => sum + tb.count, 0);

    return { trackBreakdown, subjectCounts, totalStudents };
  };

  const resetForm = () => {
    setName("");
    setCapacity(undefined);
    setRoomType("CLASSROOM");
    setGradeId("");
    setStreamId("");
    setSelectedTrackIds([]);
    setRoomMode("standard");
    setSelectedRoom(null);
  };

  const getTrackLabel = (tId: string) => {
    const track = tracks.find((t: any) => t.id === tId);
    if (!track) return "";
    const subjectNames = (track.subject_ids || [])
      .map((sid: string) => trackSubjects.find((s: any) => s.id === sid)?.name)
      .filter(Boolean);
    return subjectNames.join(", ");
  };

  const getTrackSubjectsSummary = (tIds: string[]) => {
    // Get unique subject names across all tracks
    const allSubjects = new Set<string>();
    tIds.forEach(tId => {
      const track = tracks.find((t: any) => t.id === tId);
      if (track) {
        (track.subject_ids || []).forEach((sid: string) => {
          const subject = trackSubjects.find((s: any) => s.id === sid);
          if (subject) allSubjects.add(subject.name);
        });
      }
    });
    return Array.from(allSubjects).join(", ");
  };

  const toggleTrackId = (trackId: string) => {
    setSelectedTrackIds(prev => {
      const next = prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId];
      // Auto-determine room mode
      if (next.length === 0) setRoomMode("standard");
      else if (next.length === 1) setRoomMode("full");
      else setRoomMode("split");
      return next;
    });
  };

  const handleAddRoom = async () => {
    setLoading(true);
    try {
      await onCreateRoom({
        name,
        capacity,
        roomType,
        schoolId,
        gradeId: gradeId || undefined,
        streamId: streamId || undefined,
        trackId: selectedTrackIds[0] || undefined,
        trackIds: selectedTrackIds.length > 0 ? selectedTrackIds : undefined,
        roomMode: selectedTrackIds.length > 0 ? roomMode : 'standard',
      } as any);
      setIsAddDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error adding room:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRoom = async () => {
    if (!selectedRoom) return;
    setLoading(true);
    try {
      await onUpdateRoom(selectedRoom.id, {
        name,
        capacity,
        roomType,
        gradeId: gradeId || undefined,
        streamId: streamId || undefined,
        trackId: selectedTrackIds[0] || undefined,
        trackIds: selectedTrackIds.length > 0 ? selectedTrackIds : undefined,
        roomMode: selectedTrackIds.length > 0 ? roomMode : 'standard',
      } as any);
      setIsEditDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error updating room:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (room: Room) => {
    setSelectedRoom(room);
    setName(room.name);
    setCapacity(room.capacity);
    setRoomType(room.roomType);
    setGradeId(room.gradeId || "");
    setStreamId(room.streamId || "");
    setSelectedTrackIds(room.trackIds || (room.trackId ? [room.trackId] : []));
    setRoomMode(room.roomMode || 'standard');
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    if (confirm("Are you sure you want to delete this room?")) {
      try {
        await onDeleteRoom(id);
      } catch (error) {
        console.error("Error deleting room:", error);
      }
    }
  };

  const handleGenerateFromStreams = async () => {
    if (!onGenerateFromStreams) return;
    setGenerating(true);
    setGenerateResult(null);
    try {
      const result = await onGenerateFromStreams();
      setGenerateResult(result);
    } catch (error) {
      console.error("Error generating rooms:", error);
    } finally {
      setGenerating(false);
    }
  };

  // Filter rooms by grade
  const filteredRooms = filterGradeId === "all"
    ? rooms
    : rooms.filter((r) => r.gradeId === filterGradeId);

  // Group rooms by grade for display
  const roomsByGrade = filteredRooms.reduce((acc, room) => {
    const key = room.gradeName || "Unassigned";
    if (!acc[key]) acc[key] = [];
    acc[key].push(room);
    return acc;
  }, {} as Record<string, Room[]>);

  const getRoomModeLabel = (room: Room) => {
    const tIds = room.trackIds || (room.trackId ? [room.trackId] : []);
    if (tIds.length === 0) return null;
    if (tIds.length === 1) return "Full";
    return "Split";
  };

  const getRoomModeBadgeVariant = (room: Room) => {
    const tIds = room.trackIds || (room.trackId ? [room.trackId] : []);
    if (tIds.length <= 1) return "default" as const;
    return "secondary" as const;
  };

  const getRoomTrackNames = (room: Room) => {
    const tIds = room.trackIds || (room.trackId ? [room.trackId] : []);
    return tIds.map(tId => {
      const track = tracks.find((t: any) => t.id === tId);
      return track?.name || "";
    }).filter(Boolean);
  };

  // Track selection UI shared between add/edit dialogs
  const renderTrackSelector = (idPrefix: string) => {
    if (!isCBESenior || tracks.length === 0) return null;

    const totalSelectedStudents = selectedTrackIds.reduce((sum, tId) => {
      return sum + ((trackStudentCounts as Record<string, number>)[tId] || 0);
    }, 0);

    return (
      <div className="grid gap-3">
        <Label>Room Type (CBE Senior)</Label>
        <div className="flex gap-3">
          <Button
            type="button"
            size="sm"
            variant={roomMode === 'full' || selectedTrackIds.length <= 1 ? 'default' : 'outline'}
            onClick={() => {
              if (selectedTrackIds.length > 1) {
                setSelectedTrackIds([selectedTrackIds[0]]);
              }
              setRoomMode('full');
            }}
            disabled={selectedTrackIds.length === 0}
          >
            Full Room
          </Button>
          <Button
            type="button"
            size="sm"
            variant={roomMode === 'split' && selectedTrackIds.length > 1 ? 'default' : 'outline'}
            onClick={() => setRoomMode('split')}
            disabled={selectedTrackIds.length === 0}
          >
            Split Room
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {roomMode === 'full' 
            ? "Full: One track occupies the entire room" 
            : roomMode === 'split'
            ? "Split: Multiple tracks share this room (for smaller groups)"
            : "Select tracks below to set room type"}
        </p>

        <div className="border rounded-lg p-3 space-y-2 max-h-[200px] overflow-y-auto">
          {tracks.map((track: any) => {
            const studentCount = (trackStudentCounts as Record<string, number>)[track.id] || 0;
            const isSelected = selectedTrackIds.includes(track.id);
            const isDisabled = roomMode === 'full' && selectedTrackIds.length >= 1 && !isSelected;

            return (
              <div key={track.id} className={`flex items-start gap-3 p-2 rounded-md ${isSelected ? 'bg-accent/50' : ''}`}>
                <Checkbox
                  id={`${idPrefix}-track-${track.id}`}
                  checked={isSelected}
                  onCheckedChange={() => toggleTrackId(track.id)}
                  disabled={isDisabled}
                />
                <div className="flex-1 min-w-0">
                  <label htmlFor={`${idPrefix}-track-${track.id}`} className="text-sm font-medium cursor-pointer">
                    {track.name}
                  </label>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs capitalize">{track.pathway}</Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Users className="w-3 h-3" /> {studentCount} students
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {getTrackLabel(track.id)}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {selectedTrackIds.length > 0 && (
          <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="font-medium">Selected tracks:</span>
              <Badge variant={selectedTrackIds.length === 1 ? "default" : "secondary"}>
                {selectedTrackIds.length === 1 ? "Full Room" : "Split Room"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-xs">
              {getRoomTrackNames({ trackIds: selectedTrackIds } as Room).join(" + ")}
            </p>
            <div className="flex items-center gap-1 text-xs">
              <Users className="w-3 h-3" />
              <span className="font-medium">{totalSelectedStudents} total students</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Subjects: {getTrackSubjectsSummary(selectedTrackIds)}
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Rooms
              </CardTitle>
              <CardDescription>
                Manage rooms linked to grade-stream combinations. For CBE Senior, rooms can be <strong>Full</strong> (single track) or <strong>Split</strong> (multiple tracks sharing).
              </CardDescription>
            </div>
            <div className="flex gap-2">
              {onGenerateFromStreams && (
                <Button variant="outline" onClick={() => setIsGenerateDialogOpen(true)}>
                  <Wand2 className="mr-2 h-4 w-4" /> Auto-Generate from Streams
                </Button>
              )}
              <Button onClick={() => setIsAddDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" /> Add Room
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filter by Grade */}
          <div className="mb-4">
            <Select value={filterGradeId} onValueChange={setFilterGradeId}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Filter by grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                {grades.map((grade: any) => (
                  <SelectItem key={grade.id} value={grade.id}>
                    {grade.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredRooms.length === 0 ? (
            <p className="text-muted-foreground">No rooms available. Add one or generate from streams.</p>
          ) : (
            <div className="space-y-6">
              {Object.entries(roomsByGrade).map(([gradeName, gradeRooms]) => (
                <div key={gradeName}>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    {gradeName}
                    <Badge variant="outline">{gradeRooms.length} rooms</Badge>
                  </h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Stream</TableHead>
                        <TableHead>Track(s)</TableHead>
                        <TableHead>Mode</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Students</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {gradeRooms.map((room) => {
                        const modeLabel = getRoomModeLabel(room);
                        const trackNames = getRoomTrackNames(room);
                        const tIds = room.trackIds || (room.trackId ? [room.trackId] : []);
                        const studentBreakdown = getRoomStudentBreakdown(room);
                        return (
                          <TableRow key={room.id}>
                            <TableCell className="font-medium">{room.name}</TableCell>
                            <TableCell>{room.streamName || "-"}</TableCell>
                            <TableCell>
                              {trackNames.length > 0 ? (
                                <div className="space-y-1">
                                  {trackNames.map((tn, i) => (
                                    <div key={i}>
                                      <span className="font-medium text-sm">{tn}</span>
                                      {tIds[i] && (
                                        <p className="text-xs text-muted-foreground">{getTrackLabel(tIds[i])}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {modeLabel && (
                                <Badge variant={getRoomModeBadgeVariant(room)}>
                                  {modeLabel}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{room.roomType}</Badge>
                            </TableCell>
                            <TableCell>{room.capacity || "N/A"}</TableCell>
                            <TableCell>
                              {studentBreakdown ? (
                                <div className="space-y-2 min-w-[180px]">
                                  <div className="flex items-center gap-1 font-medium text-sm">
                                    <Users className="w-3.5 h-3.5" />
                                    {studentBreakdown.totalStudents} total
                                  </div>
                                  {studentBreakdown.trackBreakdown.length > 0 && (
                                    <div className="space-y-0.5">
                                      <p className="text-xs font-medium text-muted-foreground">By Track:</p>
                                      {studentBreakdown.trackBreakdown.map(tb => (
                                        <div key={tb.trackId} className="flex justify-between text-xs">
                                          <span className="truncate mr-2">{tb.trackName}</span>
                                          <Badge variant="outline" className="text-xs px-1.5 py-0">{tb.count}</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  {Object.keys(studentBreakdown.subjectCounts).length > 0 && (
                                    <div className="space-y-0.5">
                                      <p className="text-xs font-medium text-muted-foreground">By Subject:</p>
                                      {Object.values(studentBreakdown.subjectCounts).map(sc => (
                                        <div key={sc.name} className="flex justify-between text-xs">
                                          <span className="truncate mr-2">{sc.name}</span>
                                          <Badge variant="secondary" className="text-xs px-1.5 py-0">{sc.count}</Badge>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right flex justify-end gap-2">
                              <Button variant="outline" size="sm" onClick={() => handleEditClick(room)}>
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDeleteClick(room.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Room Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Room</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="grade">Grade (Optional)</Label>
              <Select value={gradeId || "none"} onValueChange={(v) => { setGradeId(v === "none" ? "" : v); setStreamId(""); setSelectedTrackIds([]); setRoomMode("standard"); }}>
                <SelectTrigger id="grade">
                  <SelectValue placeholder="Link to a grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {grades.map((grade: any) => (
                    <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {gradeId && (
              <div className="grid gap-2">
                <Label htmlFor="stream">Stream</Label>
                <Select value={streamId || "none"} onValueChange={(v) => setStreamId(v === "none" ? "" : v)}>
                  <SelectTrigger id="stream">
                    <SelectValue placeholder="Link to a stream" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {streams.map((stream: any) => (
                      <SelectItem key={stream.id} value={stream.id}>{stream.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {renderTrackSelector("add")}

            <div className="grid gap-2">
              <Label htmlFor="name">Room Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Grade 10 Blue" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="type">Room Type</Label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="capacity">Capacity (Optional)</Label>
              <Input id="capacity" type="number" value={capacity || ""} onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : undefined)} placeholder="e.g., 40" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsAddDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleAddRoom} disabled={!name || !roomType || loading}>
              {loading ? "Adding..." : "Add Room"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Room Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Room</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-grade">Grade</Label>
              <Select value={gradeId || "none"} onValueChange={(v) => { setGradeId(v === "none" ? "" : v); setStreamId(""); setSelectedTrackIds([]); setRoomMode("standard"); }}>
                <SelectTrigger id="edit-grade">
                  <SelectValue placeholder="Link to a grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {grades.map((grade: any) => (
                    <SelectItem key={grade.id} value={grade.id}>{grade.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {gradeId && (
              <div className="grid gap-2">
                <Label htmlFor="edit-stream">Stream</Label>
                <Select value={streamId || "none"} onValueChange={(v) => setStreamId(v === "none" ? "" : v)}>
                  <SelectTrigger id="edit-stream">
                    <SelectValue placeholder="Link to a stream" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {streams.map((stream: any) => (
                      <SelectItem key={stream.id} value={stream.id}>{stream.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {renderTrackSelector("edit")}

            <div className="grid gap-2">
              <Label htmlFor="edit-name">Room Name</Label>
              <Input id="edit-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-type">Room Type</Label>
              <Select value={roomType} onValueChange={setRoomType}>
                <SelectTrigger id="edit-type">
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  {roomTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-capacity">Capacity (Optional)</Label>
              <Input id="edit-capacity" type="number" value={capacity || ""} onChange={(e) => setCapacity(e.target.value ? parseInt(e.target.value) : undefined)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); resetForm(); }}>Cancel</Button>
            <Button onClick={handleUpdateRoom} disabled={!name || !roomType || loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generate from Streams Dialog */}
      <Dialog open={isGenerateDialogOpen} onOpenChange={(open) => {
        setIsGenerateDialogOpen(open);
        if (!open) setGenerateResult(null);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Auto-Generate Rooms from Streams</DialogTitle>
            <DialogDescription>
              This will create a room for each grade-stream combination and link them automatically (e.g., "Grade 7 Blue", "Grade 8 Red").
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {generateResult ? (
              <Alert>
                <AlertDescription>
                  <strong>Generation complete!</strong>
                  <ul className="mt-2 list-disc list-inside">
                    <li>{generateResult.created} new room(s) created</li>
                    <li>{generateResult.skipped} room(s) skipped (already exist)</li>
                  </ul>
                </AlertDescription>
              </Alert>
            ) : (
              <p className="text-muted-foreground">
                Click "Generate" to automatically create rooms based on your grade-stream combinations.
                Each stream will get its own dedicated classroom linked to its grade.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsGenerateDialogOpen(false); setGenerateResult(null); }}>
              {generateResult ? "Close" : "Cancel"}
            </Button>
            {!generateResult && (
              <Button onClick={handleGenerateFromStreams} disabled={generating}>
                {generating ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating...</>
                ) : (
                  <><Wand2 className="mr-2 h-4 w-4" /> Generate Rooms</>
                )}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
