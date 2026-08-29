
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { TimetableRule } from "@/types";

type RuleBuilderProps = {
  existingRules: TimetableRule[];
  subjects: string[];
  teacherIds: { id: string; name: string }[];
  roomIds: { id: string; name: string }[];
  onAddRule: (rule: Omit<TimetableRule, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onDeleteRule: (id: string) => Promise<void>;
  schoolId: string;
};

export const RuleBuilder: React.FC<RuleBuilderProps> = ({
  existingRules,
  subjects,
  teacherIds,
  roomIds,
  onAddRule,
  onDeleteRule,
  schoolId,
}) => {
  const [activeTab, setActiveTab] = useState("subject-sequence");
  const [loading, setLoading] = useState(false);

  // Subject Sequence Rule
  const [sequenceSubjectA, setSequenceSubjectA] = useState<string>("");
  const [sequenceSubjectB, setSequenceSubjectB] = useState<string>("");
  const [sequenceConstraint, setSequenceConstraint] = useState<string>("CANNOT_FOLLOW");

  // Lesson Duration Rule
  const [durationSubject, setDurationSubject] = useState<string>("");
  const [minPeriods, setMinPeriods] = useState<number>(2);

  // Teacher Constraint Rule
  const [teacherId, setTeacherId] = useState<string>("");
  const [availableDays, setAvailableDays] = useState<string[]>([]);

  // Room Allocation Rule
  const [subjectForRoom, setSubjectForRoom] = useState<string>("");
  const [requiredRoomId, setRequiredRoomId] = useState<string>("");

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const handleDaySelect = (day: string) => {
    if (availableDays.includes(day)) {
      setAvailableDays(availableDays.filter((d) => d !== day));
    } else {
      setAvailableDays([...availableDays, day]);
    }
  };

  const handleAddRule = async () => {
    setLoading(true);
    try {
      let ruleData: any = {};
      let ruleType = "";

      switch (activeTab) {
        case "subject-sequence":
          ruleType = "SUBJECT_SEQUENCE";
          ruleData = {
            subjectA: sequenceSubjectA,
            subjectB: sequenceSubjectB,
            constraint: sequenceConstraint,
          };
          break;
        case "lesson-duration":
          ruleType = "LESSON_DURATION";
          ruleData = {
            subject: durationSubject,
            minPeriods,
          };
          break;
        case "teacher-constraint":
          ruleType = "TEACHER_CONSTRAINT";
          ruleData = {
            teacherId,
            availableDays,
          };
          break;
        case "room-allocation":
          ruleType = "ROOM_ALLOCATION";
          ruleData = {
            subject: subjectForRoom,
            roomId: requiredRoomId,
          };
          break;
      }

      await onAddRule({
        schoolId,
        ruleType,
        ruleData,
        isActive: true,
      });

      // Reset form based on the active tab
      switch (activeTab) {
        case "subject-sequence":
          setSequenceSubjectA("");
          setSequenceSubjectB("");
          setSequenceConstraint("CANNOT_FOLLOW");
          break;
        case "lesson-duration":
          setDurationSubject("");
          setMinPeriods(2);
          break;
        case "teacher-constraint":
          setTeacherId("");
          setAvailableDays([]);
          break;
        case "room-allocation":
          setSubjectForRoom("");
          setRequiredRoomId("");
          break;
      }
    } catch (error) {
      console.error("Error adding rule:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderRuleDescription = (rule: TimetableRule) => {
    try {
      const data = rule.ruleData;
      
      switch (rule.ruleType) {
        case "SUBJECT_SEQUENCE":
          return `${data.subjectA} ${data.constraint === "CANNOT_FOLLOW" ? "cannot follow" : "must follow"} ${data.subjectB}`;
        case "LESSON_DURATION":
          return `${data.subject} must have at least ${data.minPeriods} consecutive periods`;
        case "TEACHER_CONSTRAINT":
          const teacher = teacherIds.find((t) => t.id === data.teacherId);
          return `${teacher?.name || "Teacher"} is only available on ${data.availableDays.join(", ")}`;
        case "ROOM_ALLOCATION":
          const room = roomIds.find((r) => r.id === data.roomId);
          return `${data.subject} must be taught in ${room?.name || "specific room"}`;
        default:
          return "Unknown rule type";
      }
    } catch (error) {
      return "Invalid rule format";
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Timetable Rules</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="subject-sequence">Subject Sequence</TabsTrigger>
              <TabsTrigger value="lesson-duration">Lesson Duration</TabsTrigger>
              <TabsTrigger value="teacher-constraint">Teacher Constraints</TabsTrigger>
              <TabsTrigger value="room-allocation">Room Allocation</TabsTrigger>
            </TabsList>

            <TabsContent value="subject-sequence" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="sequenceSubjectA">Subject A</Label>
                  <Select value={sequenceSubjectA} onValueChange={setSequenceSubjectA}>
                    <SelectTrigger id="sequenceSubjectA">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sequenceConstraint">Constraint</Label>
                  <Select value={sequenceConstraint} onValueChange={setSequenceConstraint}>
                    <SelectTrigger id="sequenceConstraint">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CANNOT_FOLLOW">Cannot Follow</SelectItem>
                      <SelectItem value="MUST_FOLLOW">Must Follow</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sequenceSubjectB">Subject B</Label>
                  <Select value={sequenceSubjectB} onValueChange={setSequenceSubjectB}>
                    <SelectTrigger id="sequenceSubjectB">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="lesson-duration" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="durationSubject">Subject</Label>
                  <Select value={durationSubject} onValueChange={setDurationSubject}>
                    <SelectTrigger id="durationSubject">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="minPeriods">Minimum Consecutive Periods</Label>
                  <Input
                    id="minPeriods"
                    type="number"
                    min="1"
                    max="4"
                    value={minPeriods}
                    onChange={(e) => setMinPeriods(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="teacher-constraint" className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="teacherId">Teacher</Label>
                  <Select value={teacherId} onValueChange={setTeacherId}>
                    <SelectTrigger id="teacherId">
                      <SelectValue placeholder="Select teacher" />
                    </SelectTrigger>
                    <SelectContent>
                      {teacherIds.map((teacher) => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Available Days</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {days.map((day) => (
                      <Badge
                        key={day}
                        variant={availableDays.includes(day) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => handleDaySelect(day)}
                      >
                        {day}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="room-allocation" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subjectForRoom">Subject</Label>
                  <Select value={subjectForRoom} onValueChange={setSubjectForRoom}>
                    <SelectTrigger id="subjectForRoom">
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="requiredRoomId">Required Room</Label>
                  <Select value={requiredRoomId} onValueChange={setRequiredRoomId}>
                    <SelectTrigger id="requiredRoomId">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent>
                      {roomIds.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <Button
            onClick={handleAddRule}
            disabled={loading || (
              (activeTab === "subject-sequence" && (!sequenceSubjectA || !sequenceSubjectB)) ||
              (activeTab === "lesson-duration" && !durationSubject) ||
              (activeTab === "teacher-constraint" && (!teacherId || availableDays.length === 0)) ||
              (activeTab === "room-allocation" && (!subjectForRoom || !requiredRoomId))
            )}
            className="mt-4"
          >
            {loading ? "Adding..." : "Add Rule"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Rules</CardTitle>
        </CardHeader>
        <CardContent>
          {existingRules.length === 0 ? (
            <p className="text-muted-foreground">No rules defined yet. Add some rules above.</p>
          ) : (
            <ul className="space-y-2">
              {existingRules.map((rule) => (
                <li
                  key={rule.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div>
                    <Badge variant="outline" className="mb-1">
                      {rule.ruleType.replace(/_/g, " ")}
                    </Badge>
                    <p>{renderRuleDescription(rule)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDeleteRule(rule.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
