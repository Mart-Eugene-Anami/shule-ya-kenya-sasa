import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { SubjectManager } from "@/components/subjects/SubjectManager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const Subjects = () => {
  const { user } = useAuth();

  return (
    <DashboardLayout title="Subject Management">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Subject Management
            </CardTitle>
            <CardDescription>
              Manage subjects for each school division. Subjects are organized by division to support 
              different curricula requirements for Lower Primary, Upper Primary, Junior Secondary, and Senior Secondary.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SubjectManager readOnly={user?.role !== 'school_admin' && user?.role !== 'super_admin'} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Subjects;
