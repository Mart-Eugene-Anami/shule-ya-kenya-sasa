import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { TeacherSubjectForm } from "@/components/teachers/TeacherSubjectForm";
import { TeacherSubjectOverview } from "@/components/teachers/TeacherSubjectOverview";
import { TeacherClassAllocations } from "@/components/teachers/TeacherClassAllocations";
import { StreamTeachersOverview } from "@/components/teachers/StreamTeachersOverview";
import { TeacherClassAssignmentManager } from "@/components/teachers/TeacherClassAssignmentManager";
import { 
  UserPlus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Mail,
  BookOpen,
  GraduationCap,
  Users,
  Upload,
  LayoutGrid,
  ClipboardList
} from "lucide-react";
import TeacherBulkImportDialog from "@/components/teachers/TeacherBulkImportDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataQuery } from "@/hooks/useDataQuery";
import { supabase } from "@/integrations/supabase/client";
import { Teacher } from "@/types";

const Teachers = () => {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [activeTab, setActiveTab] = useState("teachers");
  const [schoolSubjects, setSchoolSubjects] = useState<string[]>([]);

  const canManageTeachers = user?.role === "school_admin" || user?.role === "super_admin";

  // Fetch real teachers data
  const { 
    data: teachers = [], 
    isLoading: loading, 
    refetch: refetchTeachers 
  } = useDataQuery<Teacher>({
    tableName: 'teachers',
    schoolId: user?.schoolId,
    orderBy: 'name',
    orderDirection: 'asc'
  });

  // Fetch school subjects only when subjects tab is active
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!user?.schoolId || activeTab !== "subjects") return;
      const { data } = await supabase
        .from('subjects')
        .select('name')
        .eq('school_id', user.schoolId)
        .eq('is_active', true);
      if (data) {
        const uniqueNames = [...new Set(data.map(s => s.name))].sort();
        setSchoolSubjects(uniqueNames);
      }
    };
    fetchSubjects();
  }, [user?.schoolId, activeTab]);

  const filteredTeachers = teachers.filter(teacher =>
    teacher.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (teacher.email && teacher.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (teacher.subject && teacher.subject.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleTeacherSaved = () => {
    setIsCreateDialogOpen(false);
    setIsEditDialogOpen(false);
    setSelectedTeacher(null);
    refetchTeachers();
  };

  const handleEditTeacher = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsEditDialogOpen(true);
  };

  const handleDeleteTeacher = async (teacherId: string) => {
    toast({
      title: "Feature Coming Soon",
      description: "Teacher deletion will be implemented in the next update.",
    });
  };

  const getStatusBadge = (status?: string) => {
    return status === "active" 
      ? <Badge className="bg-green-100 text-green-800">Active</Badge>
      : <Badge variant="secondary">Inactive</Badge>;
  };

  return (
    <DashboardLayout title="Teachers Management">
      <div className="space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Teachers</h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Manage teaching staff, subject allocations, and class assignments
            </p>
          </div>
          
          {canManageTeachers && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setIsBulkImportOpen(true)}>
                <Upload className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Bulk Import</span>
                <span className="sm:hidden">Import</span>
              </Button>
              <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    <span className="hidden sm:inline">Add Teacher</span>
                    <span className="sm:hidden">Add</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Teacher</DialogTitle>
                    <DialogDescription>
                      Add a new teacher. Only the name is required — other details can be added later.
                    </DialogDescription>
                  </DialogHeader>
                  <TeacherSubjectForm
                    onSaved={handleTeacherSaved}
                    onCancel={() => setIsCreateDialogOpen(false)}
                  />
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>

        {/* Summary Stats */}
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-2xl font-bold">{teachers.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-green-100 p-2">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">
                    {teachers.filter(t => (t as any).status === "active").length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-purple-100 p-2">
                  <GraduationCap className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Class Teachers</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {teachers.filter(t => t.isStreamTeacher).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-orange-100 p-2">
                  <BookOpen className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Subject Only</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {teachers.filter(t => !t.isStreamTeacher).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="w-full sm:w-auto grid grid-cols-5 sm:inline-grid gap-1">
            <TabsTrigger value="teachers" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <Users className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">All Teachers</span>
              <span className="sm:hidden">Teachers</span>
            </TabsTrigger>
            <TabsTrigger value="assign" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <ClipboardList className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Assign to Classes</span>
              <span className="sm:hidden">Assign</span>
            </TabsTrigger>
            <TabsTrigger value="subjects" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">By Subject</span>
              <span className="sm:hidden">Subjects</span>
            </TabsTrigger>
            <TabsTrigger value="allocations" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Class Allocations</span>
              <span className="sm:hidden">Classes</span>
            </TabsTrigger>
            <TabsTrigger value="stream-teachers" className="text-xs sm:text-sm gap-1 sm:gap-2">
              <GraduationCap className="h-3 w-3 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Stream Teachers</span>
              <span className="sm:hidden">Stream</span>
            </TabsTrigger>
          </TabsList>

          {/* All Teachers Tab */}
          <TabsContent value="teachers" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <CardTitle className="text-base">Teachers List</CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      All teachers with their current assignments
                    </CardDescription>
                  </div>
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search teachers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8 h-9"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                    <p className="text-muted-foreground mt-2 text-sm">Loading teachers...</p>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table */}
                    <div className="hidden md:block">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Subjects</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            {canManageTeachers && <TableHead className="text-right">Actions</TableHead>}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredTeachers.map((teacher) => (
                            <TableRow key={teacher.id}>
                              <TableCell className="font-medium">{teacher.name}</TableCell>
                              <TableCell>
                                <div className="flex items-center text-sm">
                                  <Mail className="mr-2 h-3 w-3 text-muted-foreground" />
                                  <span className="truncate max-w-[200px]">{teacher.email || '—'}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {(teacher.subjectsTaught && teacher.subjectsTaught.length > 0) ? (
                                    teacher.subjectsTaught.slice(0, 2).map((subj, idx) => (
                                      <Badge key={idx} variant="outline" className="text-xs">
                                        {subj}
                                      </Badge>
                                    ))
                                  ) : (
                                    <Badge variant="outline" className="text-xs">
                                      {teacher.subject}
                                    </Badge>
                                  )}
                                  {teacher.subjectsTaught && teacher.subjectsTaught.length > 2 && (
                                    <Badge variant="secondary" className="text-xs">
                                      +{teacher.subjectsTaught.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                {teacher.isStreamTeacher ? (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">
                                    <GraduationCap className="mr-1 h-3 w-3" />
                                    Class
                                  </Badge>
                                ) : (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">
                                    <BookOpen className="mr-1 h-3 w-3" />
                                    Subject
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{getStatusBadge((teacher as any).status)}</TableCell>
                              {canManageTeachers && (
                                <TableCell className="text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" className="h-8 w-8 p-0">
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                      <DropdownMenuItem onClick={() => handleEditTeacher(teacher)}>
                                        <Edit className="mr-2 h-4 w-4" />
                                        Edit
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem 
                                        onClick={() => handleDeleteTeacher(teacher.id)}
                                        className="text-destructive"
                                      >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Remove
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </TableCell>
                              )}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile Cards */}
                    <div className="md:hidden space-y-3">
                      {filteredTeachers.map((teacher) => (
                        <Card key={teacher.id} className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">{teacher.name}</p>
                                {getStatusBadge((teacher as any).status)}
                              </div>
                              <p className="text-xs text-muted-foreground truncate">{teacher.email || 'No email'}</p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {teacher.isStreamTeacher && (
                                  <Badge className="bg-purple-100 text-purple-800 text-xs">Class Teacher</Badge>
                                )}
                                {(teacher.subjectsTaught && teacher.subjectsTaught.length > 0) ? (
                                  teacher.subjectsTaught.slice(0, 2).map((subj, idx) => (
                                    <Badge key={idx} variant="outline" className="text-xs">{subj}</Badge>
                                  ))
                                ) : (
                                  <Badge variant="outline" className="text-xs">{teacher.subject}</Badge>
                                )}
                              </div>
                            </div>
                            {canManageTeachers && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-background border shadow-lg">
                                  <DropdownMenuItem onClick={() => handleEditTeacher(teacher)}>
                                    <Edit className="mr-2 h-4 w-4" />Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    onClick={() => handleDeleteTeacher(teacher.id)}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />Remove
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </Card>
                      ))}
                    </div>
                  </>
                )}
                
                {!loading && filteredTeachers.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {searchTerm 
                      ? `No teachers found matching "${searchTerm}"`
                      : "No teachers found. Add your first teacher to get started."
                    }
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Assign to Classes Tab */}
          <TabsContent value="assign">
            {activeTab === "assign" && <TeacherClassAssignmentManager />}
          </TabsContent>

          {/* Subjects Overview Tab */}
          <TabsContent value="subjects">
            {activeTab === "subjects" && (
              <TeacherSubjectOverview teachers={teachers} subjects={schoolSubjects} />
            )}
          </TabsContent>

          {/* Class Allocations Tab */}
          <TabsContent value="allocations">
            {activeTab === "allocations" && <TeacherClassAllocations teachers={teachers} />}
          </TabsContent>

          {/* Stream Teachers Tab */}
          <TabsContent value="stream-teachers">
            {activeTab === "stream-teachers" && <StreamTeachersOverview teachers={teachers} />}
          </TabsContent>
        </Tabs>

        {/* Edit Teacher Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Teacher</DialogTitle>
              <DialogDescription>
                Update teacher information and assignments.
              </DialogDescription>
            </DialogHeader>
            {selectedTeacher && (
              <TeacherSubjectForm
                teacherId={selectedTeacher.id}
                onSaved={handleTeacherSaved}
                onCancel={() => setIsEditDialogOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Bulk Import Dialog */}
        <TeacherBulkImportDialog
          isOpen={isBulkImportOpen}
          onOpenChange={setIsBulkImportOpen}
          onUploadComplete={() => refetchTeachers()}
        />

        {/* Help Section for Non-Admins */}
        {!canManageTeachers && (
          <Card className="bg-muted/50 border-muted">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Users className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Need to Manage Teachers?</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Contact your school administrator to add, edit, or remove teachers.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Teachers;