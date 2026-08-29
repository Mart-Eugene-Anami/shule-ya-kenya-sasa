
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, ClipboardCheck, GraduationCap, Upload } from "lucide-react";
import { MarkEntrySelector } from "@/components/marks/MarkEntrySelector";
import StreamMarkEntryGrid from "@/components/marks/StreamMarkEntryGrid";
import { RubricManager } from "@/components/marks/RubricManager";
import BulkMarkUploadDialog from "@/components/marks/BulkMarkUploadDialog";
import { Exam, Grade } from "@/types";
import { useDataQuery } from "@/hooks/useDataQuery";

interface MarkEntrySelection {
  streamId: string;
  gradeId: string;
  subject: string;
  assessmentTypeId: string;
  examId: string;
}

const MarkEntry = () => {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'selector' | 'entry'>('selector');
  const [selectionData, setSelectionData] = useState<MarkEntrySelection | null>(null);
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);

  const { data: exams = [] } = useDataQuery<Exam>({
    tableName: 'exams',
    schoolId: user?.schoolId,
    orderBy: 'created_at',
    orderDirection: 'desc',
  });

  const { data: grades = [] } = useDataQuery<Grade>({
    tableName: 'grades',
    schoolId: user?.schoolId,
    orderBy: 'level',
    orderDirection: 'asc',
  });

  const activeExams = exams.filter(e => e.isActive);

  const handleSelection = (data: MarkEntrySelection) => {
    setSelectionData(data);
    setCurrentView('entry');
  };

  const handleBackToSelector = () => {
    setCurrentView('selector');
    setSelectionData(null);
  };

  const canManageRubrics = user?.role === 'school_admin' || user?.role === 'super_admin';

  return (
    <DashboardLayout title="Mark Entry System">
      <div className="space-y-6">
        {currentView === 'selector' ? (
          <Tabs defaultValue="entry" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="entry" className="flex items-center">
                <ClipboardCheck className="mr-2 h-4 w-4" />
                Mark Entry
              </TabsTrigger>
              <TabsTrigger value="bulk" className="flex items-center">
                <Upload className="mr-2 h-4 w-4" />
                Bulk Upload
              </TabsTrigger>
              {canManageRubrics && (
                <TabsTrigger value="rubrics" className="flex items-center">
                  <GraduationCap className="mr-2 h-4 w-4" />
                  Manage Rubrics
                </TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="entry" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Stream-Based Mark Entry</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Enter marks for an entire stream for a specific exam with automatic grade conversion using predefined rubrics
                  </p>
                </CardHeader>
                <CardContent>
                  <MarkEntrySelector onSelection={handleSelection} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Bulk Mark Upload</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Upload marks for an entire stream via CSV file. Select an exam and stream to begin.
                  </p>
                </CardHeader>
                <CardContent>
                  <BulkMarkUploadDialog
                    isOpen={false}
                    onOpenChange={() => {}}
                    exams={activeExams}
                    grades={grades}
                  />
                  {/* Inline bulk upload form */}
                  <div className="space-y-4">
                    <Button onClick={() => setBulkUploadOpen(true)}>
                      <Upload className="mr-2 h-4 w-4" />
                      Open Bulk Upload
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            {canManageRubrics && (
              <TabsContent value="rubrics" className="space-y-6">
                <RubricManager />
              </TabsContent>
            )}
          </Tabs>
        ) : (
          <div className="space-y-4">
            <Button variant="outline" onClick={handleBackToSelector}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Selection
            </Button>
            
            {selectionData && (
              <StreamMarkEntryGrid
                streamId={selectionData.streamId}
                gradeId={selectionData.gradeId}
                subject={selectionData.subject}
                assessmentTypeId={selectionData.assessmentTypeId}
                examId={selectionData.examId}
              />
            )}
          </div>
        )}
      </div>

      {/* Bulk Mark Upload Dialog */}
      <BulkMarkUploadDialog
        isOpen={bulkUploadOpen}
        onOpenChange={setBulkUploadOpen}
        exams={activeExams}
        grades={grades}
      />
    </DashboardLayout>
  );
};

export default MarkEntry;
