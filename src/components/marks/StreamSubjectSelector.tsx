
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, BookOpen, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Stream {
  id: string;
  name: string;
  grade: {
    id: string;
    name: string;
  };
}

interface StreamSubjectSelectorProps {
  examId: string;
  onSelect: (streamId: string, gradeId: string, subject: string) => void;
}

export const StreamSubjectSelector = ({ examId, onSelect }: StreamSubjectSelectorProps) => {
  const { toast } = useToast();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedStream, setSelectedStream] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch streams and subjects
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        
        // Fetch exam details to get subjects
        const { data: examData, error: examError } = await supabase
          .from('exams')
          .select('subjects')
          .eq('id', examId)
          .single();
          
        if (examError) throw examError;
        
        // Fetch streams with proper relationship query
        const { data: streamsData, error: streamsError } = await supabase
          .from('streams')
          .select(`
            id, 
            name, 
            grade_id,
            grades:grades!streams_grade_id_fkey(id, name)
          `)
          .order('name');
          
        if (streamsError) throw streamsError;
        
        // Transform the data to match the expected interface
        const transformedStreams = streamsData?.map(stream => ({
          id: stream.id,
          name: stream.name,
          grade: {
            id: stream.grades?.id || '',
            name: stream.grades?.name || ''
          }
        })) || [];
        
        setSubjects(examData.subjects || []);
        setStreams(transformedStreams);
        
      } catch (error: any) {
        console.error("Error fetching data:", error);
        toast({
          title: "Failed to load data",
          description: error.message || "There was an error loading the streams and subjects",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [examId, toast]);
  
  const handleStreamClick = (streamId: string) => {
    setSelectedStream(streamId === selectedStream ? null : streamId);
  };
  
  const handleSubjectClick = (subject: string) => {
    if (selectedStream) {
      const stream = streams.find(s => s.id === selectedStream);
      onSelect(selectedStream, stream?.grade?.id || '', subject);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <span className="ml-2">Loading...</span>
      </div>
    );
  }
  
  if (streams.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <GraduationCap className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Streams Available</h3>
          <p className="text-gray-500 mb-4">There are no streams configured in the system.</p>
          <p className="text-gray-500">Please create streams and assign students before entering marks.</p>
        </CardContent>
      </Card>
    );
  }
  
  if (subjects.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Subjects Available</h3>
          <p className="text-gray-500 mb-4">This exam does not have any subjects configured.</p>
          <p className="text-gray-500">Please update the exam to include subjects before entering marks.</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="grid md:grid-cols-2 gap-6">
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <GraduationCap className="mr-2 h-5 w-5" />
              Select Class/Stream
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              {streams.map((stream) => (
                <div
                  key={stream.id}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer border-b hover:bg-gray-50 ${
                    selectedStream === stream.id ? "bg-primary-50 border-l-4 border-l-primary" : ""
                  }`}
                  onClick={() => handleStreamClick(stream.id)}
                >
                  <div>
                    <p className="font-medium">{stream.grade.name} {stream.name}</p>
                    <p className="text-sm text-gray-500">Grade {stream.grade.name}</p>
                  </div>
                  <ChevronRight className={`h-5 w-5 transition-transform ${
                    selectedStream === stream.id ? "rotate-90 text-primary" : "text-gray-400"
                  }`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
      
      <div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BookOpen className="mr-2 h-5 w-5" />
              Select Subject
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[400px] overflow-y-auto">
              {subjects.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  Select a stream first
                </div>
              ) : (
                subjects.map((subject) => (
                  <Button
                    key={subject}
                    variant="ghost"
                    className={`w-full justify-start rounded-none border-b h-auto py-3 ${
                      !selectedStream ? "opacity-50 cursor-not-allowed" : ""
                    }`}
                    disabled={!selectedStream}
                    onClick={() => handleSubjectClick(subject)}
                  >
                    {subject}
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
