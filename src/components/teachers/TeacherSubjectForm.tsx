
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getSchoolSubjects, getUniqueSubjectNames, type SchoolSubject } from "@/services/subjectService";
import { sanitizeInput, sanitizeEmail } from "@/utils/sanitize";

interface TeacherData {
  id: string;
  name: string;
  email: string;
  subject: string;
  is_stream_teacher: boolean;
  stream_id: string | null;
}

interface GradeStreamCombination {
  id: string;
  gradeId: string;
  streamId: string;
  gradeName: string;
  streamName: string;
  displayName: string;
  teacherId?: string;
}

interface TeacherSubjectFormProps {
  teacherId?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export const TeacherSubjectForm = ({ teacherId, onSaved, onCancel }: TeacherSubjectFormProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [isLoading, setIsLoading] = useState(false);
  const [gradeStreamCombinations, setGradeStreamCombinations] = useState<GradeStreamCombination[]>([]);
  
  // Form data
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);
  const [maxLessonsPerWeek, setMaxLessonsPerWeek] = useState<number>(30);
  const [isStreamTeacher, setIsStreamTeacher] = useState(false);
  const [selectedGradeStreamId, setSelectedGradeStreamId] = useState<string>("");
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(true);
  
  const isEditMode = !!teacherId;
  const [existingEmail, setExistingEmail] = useState<string | null>(null);
  const [hasAuthAccount, setHasAuthAccount] = useState(false);
  const schoolId = user?.schoolId || localStorage.getItem('currentSchoolId') || "";

  useEffect(() => {
    if (!schoolId) {
      setLoadingSubjects(false);
      return;
    }

    loadGradeStreamCombinations(schoolId);
    loadSchoolSubjects(schoolId);
    if (isEditMode) {
      loadTeacherData(schoolId);
    }
  }, [teacherId, schoolId]);

  const loadSchoolSubjects = async (schoolId: string) => {
    try {
      if (!schoolId) {
        setSchoolSubjects([]);
        setLoadingSubjects(false);
        return;
      }
      
      setLoadingSubjects(true);
      const subjects = await getSchoolSubjects(schoolId);
      setSchoolSubjects(subjects);
    } catch (error) {
      console.error("Error loading school subjects:", error);
      setSchoolSubjects([]);
    } finally {
      setLoadingSubjects(false);
    }
  };

  const loadGradeStreamCombinations = async (schoolId: string) => {
    try {
      if (!schoolId) return;

      // Import the function dynamically to avoid circular dependencies
      const { getSchoolStreamGradeCombinations } = await import('@/services/academicService');
      const combinations = await getSchoolStreamGradeCombinations(schoolId);
      setGradeStreamCombinations(combinations);
    } catch (error: any) {
      console.error("Error loading grade-stream combinations:", error);
      toast({
        title: "Error",
        description: "Failed to load grade-stream combinations",
        variant: "destructive"
      });
    }
  };

  const loadTeacherData = async (schoolId: string) => {
    if (!teacherId || !schoolId) return;

    try {
      const { data: teacherData, error: teacherError } = await supabase
        .from('teachers')
        .select('*')
        .eq('id', teacherId)
        .single();

      if (teacherError) throw teacherError;

      setName(teacherData.name);
      setExistingEmail(teacherData.email || null);
      setHasAuthAccount(!!teacherData.user_id);
      setEmail(teacherData.email || "");
      setSubjects(teacherData.subjects_taught || [teacherData.subject].filter(Boolean));
      setMaxLessonsPerWeek(teacherData.max_lessons_per_week || 30);
      setIsStreamTeacher(teacherData.is_stream_teacher || false);

      // If teacher is a stream teacher, find their grade-stream assignment
      if (teacherData.is_stream_teacher) {
        const { data: gradeStreamData, error: gsError } = await supabase
          .from('grade_streams')
          .select('id')
          .eq('teacher_id', teacherId)
          .maybeSingle();

        if (!gsError && gradeStreamData) {
          setSelectedGradeStreamId(gradeStreamData.id);
        }
      }
    } catch (error: any) {
      console.error("Error loading teacher data:", error);
      toast({
        title: "Failed to load teacher data",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Whether we should show password fields (new teacher with email, or editing teacher without account who now has email)
  const showPasswordFields = email.trim() && (!isEditMode || (isEditMode && !hasAuthAccount));

  const validateForm = () => {
    if (!name.trim()) {
      toast({ title: "Error", description: "Teacher name is required", variant: "destructive" });
      return false;
    }
    if (email.trim() && !email.includes('@')) {
      toast({ title: "Error", description: "Please enter a valid email address", variant: "destructive" });
      return false;
    }
    if (showPasswordFields && password) {
      if (password.length < 6) {
        toast({ title: "Error", description: "Password must be at least 6 characters", variant: "destructive" });
        return false;
      }
      if (password !== confirmPassword) {
        toast({ title: "Error", description: "Passwords do not match", variant: "destructive" });
        return false;
      }
    }
    if (isStreamTeacher && !selectedGradeStreamId) {
      toast({ title: "Error", description: "Please select a grade-stream combination for the stream teacher", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    const cleanName = sanitizeInput(name);
    const cleanEmail = sanitizeEmail(email);

    try {
      setIsLoading(true);
      if (!schoolId) {
        throw new Error("School context not found");
      }

      if (isEditMode) {
        // Update existing teacher
        const updateData: Record<string, any> = {
          name: cleanName,
          is_stream_teacher: isStreamTeacher,
          max_lessons_per_week: maxLessonsPerWeek,
          updated_at: new Date().toISOString()
        };
        if (cleanEmail.trim()) updateData.email = cleanEmail;
        if (subjects.length > 0) {
          updateData.subject = subjects[0];
          updateData.subjects_taught = subjects;
        }

        // If teacher has no auth account but email+password provided, create one
        if (!hasAuthAccount && email.trim() && password) {
          const { data: result, error: functionError } = await supabase.functions.invoke('create-teacher', {
            body: {
              name: cleanName,
              email: cleanEmail,
              password,
              subject: subjects.length > 0 ? subjects[0] : 'Unassigned',
              subjectsTaught: subjects.length > 0 ? subjects : undefined,
              isStreamTeacher,
              gradeStreamId: isStreamTeacher ? selectedGradeStreamId : undefined,
              schoolId,
              existingTeacherId: teacherId
            }
          });

          if (functionError) throw new Error(`Failed to create account: ${functionError.message}`);
          if (!result || !result.success) throw new Error(result?.error || 'Failed to create account');

          toast({
            title: "Account created",
            description: `${name} can now log in with their credentials`
          });
        } else {
          const { error: teacherError } = await supabase
            .from('teachers')
            .update(updateData)
            .eq('id', teacherId);

          if (teacherError) throw teacherError;

          // Handle stream teacher assignment
          if (isStreamTeacher && selectedGradeStreamId) {
            await supabase
              .from('grade_streams')
              .update({ teacher_id: null })
              .eq('teacher_id', teacherId);

            const { error: gsError } = await supabase
              .from('grade_streams')
              .update({ teacher_id: teacherId })
              .eq('id', selectedGradeStreamId);

            if (gsError) throw gsError;
          } else if (!isStreamTeacher) {
            await supabase
              .from('grade_streams')
              .update({ teacher_id: null })
              .eq('teacher_id', teacherId);
          }

          toast({
            title: "Teacher updated",
            description: `${name} has been updated successfully`
          });
        }
      } else if (email.trim() && password) {
        // Create new teacher with auth account using edge function
        const requestPayload: Record<string, any> = {
          name: cleanName,
          email: cleanEmail,
          password,
          subject: subjects.length > 0 ? subjects[0] : 'Unassigned',
          subjectsTaught: subjects.length > 0 ? subjects : undefined,
          isStreamTeacher,
          gradeStreamId: isStreamTeacher ? selectedGradeStreamId : undefined,
          schoolId
        };

        const { data: result, error: functionError } = await supabase.functions.invoke('create-teacher', {
          body: requestPayload
        });

        if (functionError) {
          throw new Error(`Failed to create teacher: ${functionError.message}`);
        }

        if (!result || !result.success) {
          throw new Error(result?.error || 'Failed to create teacher');
        }

        toast({
          title: "Teacher created",
          description: `${name} has been registered successfully and can now log in with their credentials`
        });
      } else {
        // Create teacher record only (no auth account)
        const insertData: Record<string, any> = {
          name: cleanName,
          school_id: schoolId,
          is_stream_teacher: isStreamTeacher,
          max_lessons_per_week: maxLessonsPerWeek,
          status: 'active',
        };
        if (cleanEmail.trim()) insertData.email = cleanEmail;
        if (subjects.length > 0) {
          insertData.subject = subjects[0];
          insertData.subjects_taught = subjects;
        }

        const { data: teacherData, error: teacherError } = await supabase
          .from('teachers')
          .insert(insertData as any)
          .select()
          .single();

        if (teacherError) throw teacherError;

        // Handle stream teacher assignment
        if (isStreamTeacher && selectedGradeStreamId && teacherData) {
          const { error: gsError } = await supabase
            .from('grade_streams')
            .update({ teacher_id: teacherData.id })
            .eq('id', selectedGradeStreamId);

          if (gsError) throw gsError;
        }

        toast({
          title: "Teacher added",
          description: `${name} has been added successfully. You can set up login credentials later.`
        });
      }

      // Reset form
      setName("");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setSubjects([]);
      setIsStreamTeacher(false);
      setSelectedGradeStreamId("");
      
      onSaved();
      
    } catch (error: any) {
      // Error handled by toast below
      
      let errorMessage = "An error occurred while saving the teacher";
      
      if (error.message?.includes('already in use') || error.message?.includes('already exists')) {
        errorMessage = `An account with email ${email} already exists`;
      } else if (error.message?.includes('Invalid email')) {
        errorMessage = "Please provide a valid email address";
      } else if (error.message?.includes('Password')) {
        errorMessage = "Password must be at least 6 characters long";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to save teacher",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name *</Label>
          <Input
            id="name"
            placeholder="Enter teacher's full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address {!isEditMode && "(for login credentials)"}</Label>
          <Input
            id="email"
            type="email"
            placeholder="teacher@school.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isLoading || (isEditMode && hasAuthAccount)}
          />
          {isEditMode && hasAuthAccount && (
            <p className="text-xs text-muted-foreground">Email cannot be changed for accounts with login credentials</p>
          )}
          {isEditMode && !hasAuthAccount && !email.trim() && (
            <p className="text-xs text-amber-600">This teacher has no login account. Enter an email and password below to create one.</p>
          )}
          {!isEditMode && !email.trim() && (
            <p className="text-xs text-muted-foreground">Enter an email address to set up login credentials for this teacher. You can also add credentials later.</p>
          )}
        </div>

        {showPasswordFields && (
          <>
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <Input
                id="password"
                type="password"
                placeholder="Create a secure password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </>
        )}

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="subjects">Subjects Taught</Label>
          {loadingSubjects ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading subjects...</span>
            </div>
          ) : schoolSubjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No subjects configured for this school. Please set up subjects in the Curriculum Setup first.
            </p>
          ) : (
           <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
              {getUniqueSubjectNames(schoolSubjects).map((subjectName) => (
                <div key={subjectName} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={`subject-${subjectName}`}
                    checked={subjects.includes(subjectName)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSubjects(prev => [...prev, subjectName]);
                      } else {
                        setSubjects(prev => prev.filter(s => s !== subjectName));
                      }
                    }}
                    disabled={isLoading}
                    className="rounded"
                  />
                  <Label htmlFor={`subject-${subjectName}`} className="text-sm cursor-pointer">
                    {subjectName}
                  </Label>
                </div>
              ))}
            </div>
          )}
          {subjects.length > 0 && (
            <div className="text-sm text-muted-foreground mt-2">
              Selected: {subjects.join(", ")}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxLessons">Maximum Lessons per Week</Label>
          <Input
            id="maxLessons"
            type="number"
            min={1}
            max={50}
            value={maxLessonsPerWeek}
            onChange={(e) => setMaxLessonsPerWeek(parseInt(e.target.value) || 30)}
            disabled={isLoading}
            className="w-32"
          />
          <p className="text-xs text-muted-foreground">
            Upper limit for weekly teaching load. The teacher may have fewer lessons depending on assignments.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Switch
              id="streamTeacher"
              checked={isStreamTeacher}
              onCheckedChange={setIsStreamTeacher}
              disabled={isLoading}
            />
            <Label htmlFor="streamTeacher">Stream Teacher</Label>
          </div>
        </div>

        {isStreamTeacher && (
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="gradeStream">Assigned Grade & Stream *</Label>
            <Select value={selectedGradeStreamId} onValueChange={setSelectedGradeStreamId} disabled={isLoading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a grade and stream" />
              </SelectTrigger>
              <SelectContent>
                {gradeStreamCombinations.map((combo) => (
                  <SelectItem key={combo.id} value={combo.id}>
                    {combo.displayName}
                    {combo.teacherId && combo.teacherId !== teacherId && " (Already assigned)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      <div className="flex justify-end space-x-2 pt-4">
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {isEditMode ? "Updating..." : "Creating..."}
            </>
          ) : (
            isEditMode ? "Update Teacher" : "Create Teacher"
          )}
        </Button>
      </div>
    </div>
  );
};
