import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { BookOpen, Users, ChevronRight } from "lucide-react";
import { Teacher } from "@/types";

interface SubjectStats {
  subject: string;
  teacherCount: number;
  teachers: Teacher[];
  percentage: number;
}

interface TeacherSubjectOverviewProps {
  teachers: Teacher[];
  subjects: string[];
}

export function TeacherSubjectOverview({ teachers, subjects }: TeacherSubjectOverviewProps) {
  const [expandedSubject, setExpandedSubject] = useState<string | null>(null);

  const subjectStats = useMemo(() => {
    const stats: SubjectStats[] = [];
    const maxTeachers = teachers.length || 1;

    // Get unique subjects from both school subjects and teacher assignments
    const allSubjects = new Set<string>(subjects);
    teachers.forEach(t => {
      if (t.subject) allSubjects.add(t.subject);
      t.subjectsTaught?.forEach(s => allSubjects.add(s));
    });

    Array.from(allSubjects).sort().forEach(subject => {
      const teachersForSubject = teachers.filter(t => 
        t.subject === subject || 
        t.subjectsTaught?.includes(subject)
      );

      stats.push({
        subject,
        teacherCount: teachersForSubject.length,
        teachers: teachersForSubject,
        percentage: (teachersForSubject.length / maxTeachers) * 100
      });
    });

    return stats.sort((a, b) => b.teacherCount - a.teacherCount);
  }, [teachers, subjects]);

  const subjectsWithoutTeachers = subjectStats.filter(s => s.teacherCount === 0);
  const subjectsWithTeachers = subjectStats.filter(s => s.teacherCount > 0);

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-blue-100 p-2">
                <BookOpen className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Subjects</p>
                <p className="text-xl font-bold">{subjectStats.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-green-100 p-2">
                <Users className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Covered</p>
                <p className="text-xl font-bold">{subjectsWithTeachers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-amber-100 p-2">
                <BookOpen className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Uncovered</p>
                <p className="text-xl font-bold text-amber-600">{subjectsWithoutTeachers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-purple-100 p-2">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Avg per Subject</p>
                <p className="text-xl font-bold">
                  {subjectsWithTeachers.length > 0 
                    ? (teachers.length / subjectsWithTeachers.length).toFixed(1)
                    : 0
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Breakdown */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Subject Coverage</CardTitle>
          <CardDescription>Teachers assigned to each subject</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {subjectsWithTeachers.map((stat) => (
              <AccordionItem key={stat.subject} value={stat.subject}>
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-normal">
                        {stat.subject}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="hidden sm:block w-32">
                        <Progress value={stat.percentage} className="h-2" />
                      </div>
                      <Badge className="bg-primary/10 text-primary hover:bg-primary/10">
                        {stat.teacherCount} {stat.teacherCount === 1 ? 'teacher' : 'teachers'}
                      </Badge>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="pl-2 space-y-2">
                    {stat.teachers.map((teacher) => (
                      <div 
                        key={teacher.id} 
                        className="flex items-center justify-between p-2 rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-2">
                          <ChevronRight className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm font-medium">{teacher.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{teacher.email}</span>
                          {teacher.isStreamTeacher && (
                            <Badge variant="secondary" className="text-xs">Stream Teacher</Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {subjectsWithoutTeachers.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-amber-600 mb-2">
                Subjects without teachers ({subjectsWithoutTeachers.length})
              </p>
              <div className="flex flex-wrap gap-2">
                {subjectsWithoutTeachers.map((stat) => (
                  <Badge key={stat.subject} variant="outline" className="text-amber-600 border-amber-300">
                    {stat.subject}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {subjectStats.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              No subjects configured. Add subjects in the curriculum settings.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
