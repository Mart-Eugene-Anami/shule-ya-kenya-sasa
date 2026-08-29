
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RankingsTable } from "./RankingsTable";
import { Medal } from "lucide-react";

interface StudentRankingsProps {
  studentId: string;
  className?: string;
}

export function StudentRankings({ studentId, className }: StudentRankingsProps) {
  // Mock data - in a real application, this would be fetched from an API
  const streamRankings = [
    { id: "1", name: "Jane Doe", value: 92.5, previousValue: 89.2 },
    { id: "2", name: "Michael Smith", value: 87.3, previousValue: 88.1 },
    { id: "3", name: "Sarah Johnson", value: 85.6, previousValue: 82.9 },
    { id: "4", name: "John Williams", value: 82.7, previousValue: 80.5 },
    { id: "5", name: "Emily Brown", value: 81.2, previousValue: 79.8 },
  ];
  
  const gradeRankings = [
    { id: "1", name: "Jane Doe", value: 92.5, previousValue: 89.2 },
    { id: "2", name: "Robert Chen", value: 90.1, previousValue: 91.3 },
    { id: "3", name: "Michael Smith", value: 87.3, previousValue: 88.1 },
    { id: "4", name: "Lisa Taylor", value: 86.5, previousValue: 85.2 },
    { id: "5", name: "Sarah Johnson", value: 85.6, previousValue: 82.9 },
    { id: "6", name: "David Martinez", value: 84.9, previousValue: 83.7 },
    { id: "7", name: "John Williams", value: 82.7, previousValue: 80.5 },
    { id: "8", name: "Emily Brown", value: 81.2, previousValue: 79.8 },
    { id: "9", name: "Kevin Wilson", value: 80.5, previousValue: 81.9 },
    { id: "10", name: "Hannah Garcia", value: 78.3, previousValue: 76.4 },
  ];
  
  const subjectRankings = [
    { subject: "Mathematics", rank: 3, score: 91, totalStudents: 25 },
    { subject: "English", rank: 5, score: 87, totalStudents: 25 },
    { subject: "Science", rank: 2, score: 93, totalStudents: 25 },
    { subject: "History", rank: 8, score: 82, totalStudents: 25 },
    { subject: "Geography", rank: 4, score: 89, totalStudents: 25 },
  ];

  // Determine the current student in the rankings
  const currentStudent = streamRankings.find(student => student.id === studentId) || streamRankings[0];
  const studentRankInStream = streamRankings.findIndex(student => student.id === studentId) + 1 || 1;
  const studentRankInGrade = gradeRankings.findIndex(student => student.id === studentId) + 1 || 2;
  
  return (
    <div className={className}>
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="stream">Stream Rankings</TabsTrigger>
          <TabsTrigger value="grade">Grade Rankings</TabsTrigger>
          <TabsTrigger value="subjects">Subject Rankings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Medal className="mr-2 h-5 w-5 text-amber-500" />
                  Your Rankings
                </CardTitle>
                <CardDescription>
                  How you compare with other students
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">In Stream (Form 1 Red):</span>
                    <span className="text-lg font-bold">
                      {studentRankInStream}
                      <span className="text-sm text-gray-500 ml-1">
                        of {streamRankings.length}
                      </span>
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center border-b pb-2">
                    <span className="font-medium">In Grade (Form 1):</span>
                    <span className="text-lg font-bold">
                      {studentRankInGrade}
                      <span className="text-sm text-gray-500 ml-1">
                        of {gradeRankings.length}
                      </span>
                    </span>
                  </div>
                  
                  <div className="pt-2">
                    <h4 className="font-medium mb-2">Subject Rankings:</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Subject</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                          <TableHead className="text-right">Rank</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {subjectRankings.map((subject) => (
                          <TableRow key={subject.subject}>
                            <TableCell>{subject.subject}</TableCell>
                            <TableCell className="text-right">{subject.score}%</TableCell>
                            <TableCell className="text-right">
                              {subject.rank}/{subject.totalStudents}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
                <CardDescription>
                  Your progress over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Average Score:</span>
                    <span className="text-lg font-bold">
                      {currentStudent.value.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Change from Last Term:</span>
                    <span className={
                      currentStudent.value > (currentStudent.previousValue || 0)
                        ? "text-green-500 font-medium"
                        : "text-red-500 font-medium"
                    }>
                      {currentStudent.value > (currentStudent.previousValue || 0) ? "+" : ""}
                      {(currentStudent.value - (currentStudent.previousValue || 0)).toFixed(1)}%
                    </span>
                  </div>
                  
                  <div className="h-40 bg-gray-100 rounded-md flex items-center justify-center">
                    <p className="text-gray-500 text-sm">Performance trend chart would appear here</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="stream">
          <RankingsTable 
            title="Stream Rankings" 
            description="How you compare with other students in your stream"
            data={streamRankings}
          />
        </TabsContent>
        
        <TabsContent value="grade">
          <RankingsTable 
            title="Grade Rankings" 
            description="How you compare with all students in your grade"
            data={gradeRankings}
          />
        </TabsContent>
        
        <TabsContent value="subjects">
          <Card>
            <CardHeader>
              <CardTitle>Subject Rankings</CardTitle>
              <CardDescription>
                Your performance in each subject compared to other students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject</TableHead>
                    <TableHead className="text-right">Your Score</TableHead>
                    <TableHead className="text-right">Class Average</TableHead>
                    <TableHead className="text-right">Your Rank</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjectRankings.map((subject) => (
                    <TableRow key={subject.subject}>
                      <TableCell className="font-medium">{subject.subject}</TableCell>
                      <TableCell className="text-right">{subject.score}%</TableCell>
                      <TableCell className="text-right">
                        {(subject.score - Math.floor(Math.random() * 10)).toFixed(1)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {subject.rank}/{subject.totalStudents}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
