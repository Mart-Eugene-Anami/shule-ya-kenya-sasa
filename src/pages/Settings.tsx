
import { useState } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const Settings = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [newStudentAlerts, setNewStudentAlerts] = useState(true);
  const [gradeReportAlerts, setGradeReportAlerts] = useState(true);
  const [systemUpdates, setSystemUpdates] = useState(false);
  const [defaultCurriculum, setDefaultCurriculum] = useState("cbc");
  const [gradingSystem, setGradingSystem] = useState("percentage");
  
  const handleSaveNotifications = () => {
    toast.success("Notification settings saved successfully");
  };
  
  const handleSavePreferences = () => {
    toast.success("Preferences saved successfully");
  };

  return (
    <DashboardLayout title="Settings">
      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-2 md:grid-cols-3">
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
        </TabsList>
        
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control which notifications you receive from the system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="email-notifications" className="flex flex-col space-y-1">
                  <span>Email Notifications</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Receive email notifications for important events
                  </span>
                </Label>
                <Switch
                  id="email-notifications"
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="new-student-alerts" className="flex flex-col space-y-1">
                  <span>New Student Alerts</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Get notified when new students are added to the system
                  </span>
                </Label>
                <Switch
                  id="new-student-alerts"
                  checked={newStudentAlerts}
                  onCheckedChange={setNewStudentAlerts}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="grade-report-alerts" className="flex flex-col space-y-1">
                  <span>Grade Report Alerts</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Get notified when new grade reports are published
                  </span>
                </Label>
                <Switch
                  id="grade-report-alerts"
                  checked={gradeReportAlerts}
                  onCheckedChange={setGradeReportAlerts}
                />
              </div>
              
              <div className="flex items-center justify-between space-x-2">
                <Label htmlFor="system-updates" className="flex flex-col space-y-1">
                  <span>System Updates</span>
                  <span className="font-normal text-xs text-muted-foreground">
                    Get notified about new system features and updates
                  </span>
                </Label>
                <Switch
                  id="system-updates"
                  checked={systemUpdates}
                  onCheckedChange={setSystemUpdates}
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSaveNotifications} className="bg-school-primary hover:bg-school-secondary">
                Save Notification Settings
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="preferences">
          <Card>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
              <CardDescription>
                Configure how the school management system works
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="default-curriculum">Default Curriculum</Label>
                <Select value={defaultCurriculum} onValueChange={setDefaultCurriculum}>
                  <SelectTrigger id="default-curriculum">
                    <SelectValue placeholder="Select default curriculum" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cbc">Competency Based Education (CBE)</SelectItem>
                    <SelectItem value="8-4-4">8-4-4 System</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The default curriculum used when adding new grades
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="grading-system">Grading System</Label>
                <Select value={gradingSystem} onValueChange={setGradingSystem}>
                  <SelectTrigger id="grading-system">
                    <SelectValue placeholder="Select grading system" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentage (0-100%)</SelectItem>
                    <SelectItem value="letter">Letter Grades (A-F)</SelectItem>
                    <SelectItem value="points">Points System (1-12)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  The grading system used in academic reports
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleSavePreferences} className="bg-school-primary hover:bg-school-secondary">
                Save Preferences
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Manage your account details and security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">admin@school.com</p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2">
                <Button variant="outline">Change Password</Button>
                <Button variant="outline" className="text-destructive hover:text-destructive">
                  Delete Account
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default Settings;
