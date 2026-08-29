
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Calendar, ClipboardList } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { StreamSubjectSelector } from "@/components/marks/StreamSubjectSelector";
import { MarkEntryBySubject } from "@/components/marks/MarkEntryBySubject";

const ExamMarks = () => {
  const { id: examId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [exam, setExam] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchExam = async () => {
      if (!examId) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from('exams')
          .select('*, terms!exams_term_id_fkey(name)')
          .eq('id', examId)
          .single();
          
        if (error) throw error;
        setExam(data);
      } catch (error: any) {
        console.error("Error fetching exam:", error);
        toast({
          title: "Failed to load exam",
          description: error.message || "There was an error loading the exam details",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchExam();
  }, [examId, toast]);
  
  const handleStreamSubjectSelect = (streamId: string, gradeId: string, subject: string) => {
    setSelectedStream(streamId);
    setSelectedGrade(gradeId);
    setSelectedSubject(subject);
  };
  
  const handleBack = () => {
    if (selectedStream && selectedSubject) {
      setSelectedStream(null);
      setSelectedGrade(null);
      setSelectedSubject(null);
    } else {
      navigate("/exams");
    }
  };
  
  // Format date to display in a user-friendly way
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };
  
  if (isLoading) {
    return (
      <DashboardLayout title="Loading Exam Details...">
        <div className="flex justify-center items-center h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <span className="ml-2">Loading exam details...</span>
        </div>
      </DashboardLayout>
    );
  }
  
  if (!exam) {
    return (
      <DashboardLayout title="Exam Not Found">
        <div className="text-center py-10">
          <ClipboardList className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Exam Not Found</h2>
          <p className="text-gray-500 mb-6">The requested exam could not be found</p>
          <Button 
            onClick={() => navigate("/exams")}
            className="bg-school-primary hover:bg-school-secondary"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Return to Exams
          </Button>
        </div>
      </DashboardLayout>
    );
  }
  
  return (
    <DashboardLayout title={selectedStream && selectedSubject ? "Enter Marks" : "Exam Details"}>
      <Button variant="outline" onClick={handleBack} className="mb-4">
        <ArrowLeft className="mr-2 h-4 w-4" />
        {selectedStream && selectedSubject ? "Back to Selection" : "Back to Exams"}
      </Button>
      
      {!selectedStream || !selectedSubject ? (
        <>
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <ClipboardList className="mr-2 h-5 w-5" /> 
                {exam.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <p className="text-sm text-gray-500 mb-1">Term</p>
                  <p>{exam.terms?.name || "Not specified"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Dates</p>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1 text-gray-500" />
                    <p>{formatDate(exam.start_date)} to {formatDate(exam.end_date)}</p>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Description</p>
                  <p>{exam.description || "No description provided"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500 mb-1">Subjects</p>
                  <p>{exam.subjects?.length ? exam.subjects.join(", ") : "No subjects specified"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <div className="mb-6">
            <h2 className="text-lg font-medium mb-4">Enter Marks by Stream and Subject</h2>
            <p className="text-gray-500 mb-6">
              Select a stream and subject to enter marks for
            </p>
            
            <StreamSubjectSelector
              examId={examId || ""}
              onSelect={handleStreamSubjectSelect}
            />
          </div>
        </>
      ) : (
        <MarkEntryBySubject
          examId={examId || ""}
          streamId={selectedStream}
          gradeId={selectedGrade || ""}
          subject={selectedSubject}
          onBack={handleBack}
        />
      )}
    </DashboardLayout>
  );
};

export default ExamMarks;
