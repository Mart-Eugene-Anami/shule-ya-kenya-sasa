import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  School, 
  MapPin, 
  Phone, 
  Mail, 
  Users, 
  GraduationCap, 
  Building,
  Edit,
  Save,
  X,
  Upload,
  Image as ImageIcon,
  Loader2
} from "lucide-react";

interface SchoolData {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  school_code: string | null;
  school_type: string | null;
  curriculum_types: string[] | null;
  established_year: number | null;
  principal_name: string | null;
  motto: string | null;
  vision: string | null;
  address: string | null;
  logo_url: string | null;
}

const SchoolInfo = () => {
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [schoolData, setSchoolData] = useState<SchoolData | null>(null);
  const [editData, setEditData] = useState<SchoolData | null>(null);
  const [stats, setStats] = useState({ students: 0, teachers: 0, grades: 0 });

  const canEdit = user?.role === "school_admin" || user?.role === "super_admin";

  useEffect(() => {
    if (user?.schoolId) {
      loadSchoolData();
      loadStats();
    }
  }, [user?.schoolId]);

  const loadSchoolData = async () => {
    if (!user?.schoolId) return;
    
    try {
      const { data, error } = await supabase
        .from("schools")
        .select("*")
        .eq("id", user.schoolId)
        .single();

      if (error) throw error;
      setSchoolData(data);
      setEditData(data);
    } catch (error) {
      console.error("Error loading school:", error);
      toast({
        title: "Error",
        description: "Failed to load school information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    if (!user?.schoolId) return;
    
    try {
      const [studentsRes, teachersRes, gradesRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId),
        supabase.from("teachers").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId),
        supabase.from("grades").select("id", { count: "exact", head: true }).eq("school_id", user.schoolId),
      ]);

      setStats({
        students: studentsRes.count || 0,
        teachers: teachersRes.count || 0,
        grades: gradesRes.count || 0,
      });
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  const handleEdit = () => {
    setEditData(schoolData);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditData(schoolData);
    setIsEditing(false);
  };

  const handleSave = async () => {
    if (!editData || !user?.schoolId) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from("schools")
        .update({
          name: editData.name,
          location: editData.location,
          phone: editData.phone,
          email: editData.email,
          school_code: editData.school_code,
          school_type: editData.school_type,
          principal_name: editData.principal_name,
          motto: editData.motto,
          vision: editData.vision,
          address: editData.address,
          established_year: editData.established_year,
        })
        .eq("id", user.schoolId);

      if (error) throw error;

      setSchoolData(editData);
      setIsEditing(false);
      
      toast({
        title: "School Information Updated",
        description: "The school details have been successfully updated.",
      });
    } catch (error) {
      console.error("Error updating school:", error);
      toast({
        title: "Update Failed",
        description: "There was an error updating the school information.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user?.schoolId) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload an image file (PNG, JPG, etc.)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload an image smaller than 2MB",
        variant: "destructive",
      });
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.schoolId}/logo.${fileExt}`;

      // Delete old logo if exists
      if (schoolData?.logo_url) {
        const oldPath = schoolData.logo_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("school-logos").remove([`${user.schoolId}/${oldPath}`]);
        }
      }

      // Upload new logo
      const { error: uploadError } = await supabase.storage
        .from("school-logos")
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("school-logos")
        .getPublicUrl(fileName);

      // Update school record with logo URL
      const { error: updateError } = await supabase
        .from("schools")
        .update({ logo_url: publicUrl })
        .eq("id", user.schoolId);

      if (updateError) throw updateError;

      // Update local state
      const updatedData = { ...schoolData!, logo_url: publicUrl };
      setSchoolData(updatedData);
      setEditData(updatedData);

      toast({
        title: "Logo Uploaded",
        description: "School logo has been updated successfully.",
      });
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Upload Failed",
        description: "There was an error uploading the logo.",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveLogo = async () => {
    if (!user?.schoolId || !schoolData?.logo_url) return;

    setUploadingLogo(true);
    try {
      // Extract file path from URL
      const urlParts = schoolData.logo_url.split("/school-logos/");
      if (urlParts[1]) {
        await supabase.storage.from("school-logos").remove([urlParts[1]]);
      }

      // Update school record
      const { error } = await supabase
        .from("schools")
        .update({ logo_url: null })
        .eq("id", user.schoolId);

      if (error) throw error;

      const updatedData = { ...schoolData, logo_url: null };
      setSchoolData(updatedData);
      setEditData(updatedData);

      toast({
        title: "Logo Removed",
        description: "School logo has been removed.",
      });
    } catch (error) {
      console.error("Error removing logo:", error);
      toast({
        title: "Error",
        description: "Failed to remove logo.",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const getSchoolTypeLabel = (type: string | null) => {
    if (!type) return "Not specified";
    const types: Record<string, string> = {
      primary: "Primary School",
      secondary: "Secondary School",
      primary_secondary: "Primary & Secondary",
    };
    return types[type] || type;
  };

  const getCurriculumLabel = (curriculum: string) => {
    const curricula: Record<string, string> = {
      cbc: "Competency Based Education (CBE)",
      "8-4-4": "8-4-4 System",
    };
    return curricula[curriculum] || curriculum.toUpperCase();
  };

  if (loading) {
    return (
      <DashboardLayout title="School Information">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  if (!schoolData) {
    return (
      <DashboardLayout title="School Information">
        <div className="text-center py-12">
          <p className="text-muted-foreground">No school information found.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="School Information">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">School Information</h1>
            <p className="text-muted-foreground mt-2">
              View and manage your school's basic information and settings
            </p>
          </div>
          
          {canEdit && !isEditing && (
            <Button onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit Information
            </Button>
          )}
          
          {isEditing && (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </div>

        {/* School Logo Section */}
        {canEdit && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ImageIcon className="mr-2 h-5 w-5" />
                School Logo
              </CardTitle>
              <CardDescription>
                Upload your school logo. This will appear on report cards and official documents.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-6">
                <div className="h-32 w-32 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden">
                  {schoolData.logo_url ? (
                    <img 
                      src={schoolData.logo_url} 
                      alt="School logo" 
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <School className="h-12 w-12 text-muted-foreground/50" />
                  )}
                </div>
                <div className="space-y-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <Button 
                    variant="outline" 
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {schoolData.logo_url ? "Change Logo" : "Upload Logo"}
                  </Button>
                  {schoolData.logo_url && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                      className="text-destructive hover:text-destructive"
                    >
                      Remove Logo
                    </Button>
                  )}
                  <p className="text-xs text-muted-foreground">
                    PNG, JPG up to 2MB. Recommended: 200x200px
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* School Overview Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Students</p>
                  <p className="text-3xl font-bold text-primary">{stats.students}</p>
                </div>
                <div className="rounded-full bg-primary/10 p-3">
                  <Users className="h-8 w-8 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Teachers</p>
                  <p className="text-3xl font-bold text-green-600">{stats.teachers}</p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Grade Levels</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.grades}</p>
                </div>
                <div className="rounded-full bg-purple-100 p-3">
                  <GraduationCap className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Established</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {schoolData.established_year || "N/A"}
                  </p>
                </div>
                <div className="rounded-full bg-orange-100 p-3">
                  <Building className="h-8 w-8 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* School Details */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <School className="mr-2 h-5 w-5" />
                Basic Information
              </CardTitle>
              <CardDescription>
                Essential details about your school
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="schoolName">School Name</Label>
                {isEditing ? (
                  <Input
                    id="schoolName"
                    value={editData?.name || ""}
                    onChange={(e) => setEditData({ ...editData!, name: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{schoolData.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolCode">School Code</Label>
                {isEditing ? (
                  <Input
                    id="schoolCode"
                    value={editData?.school_code || ""}
                    onChange={(e) => setEditData({ ...editData!, school_code: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{schoolData.school_code || "Not set"}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolType">School Type</Label>
                {isEditing ? (
                  <Select
                    value={editData?.school_type || "primary_secondary"}
                    onValueChange={(value) => setEditData({ ...editData!, school_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="primary">Primary School</SelectItem>
                      <SelectItem value="secondary">Secondary School</SelectItem>
                      <SelectItem value="primary_secondary">Primary & Secondary</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <p className="text-sm text-muted-foreground">{getSchoolTypeLabel(schoolData.school_type)}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Curriculum</Label>
                <div className="flex flex-wrap gap-2">
                  {(schoolData.curriculum_types || []).map((curriculum) => (
                    <Badge key={curriculum} variant="secondary">
                      {getCurriculumLabel(curriculum)}
                    </Badge>
                  ))}
                  {(!schoolData.curriculum_types || schoolData.curriculum_types.length === 0) && (
                    <span className="text-sm text-muted-foreground">Not specified</span>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="motto">School Motto</Label>
                {isEditing ? (
                  <Input
                    id="motto"
                    value={editData?.motto || ""}
                    onChange={(e) => setEditData({ ...editData!, motto: e.target.value })}
                    placeholder="Enter school motto"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    {schoolData.motto || "Not set"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="vision">Vision</Label>
                {isEditing ? (
                  <Textarea
                    id="vision"
                    value={editData?.vision || ""}
                    onChange={(e) => setEditData({ ...editData!, vision: e.target.value })}
                    rows={3}
                    placeholder="Enter school vision statement"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {schoolData.vision || "Not set"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Mail className="mr-2 h-5 w-5" />
                Contact Information
              </CardTitle>
              <CardDescription>
                How to reach your school
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                {isEditing ? (
                  <Textarea
                    id="address"
                    value={editData?.address || ""}
                    onChange={(e) => setEditData({ ...editData!, address: e.target.value })}
                    rows={2}
                    placeholder="Enter full address"
                  />
                ) : (
                  <div className="flex items-start text-sm text-muted-foreground">
                    <MapPin className="mr-2 h-4 w-4 mt-0.5 shrink-0" />
                    {schoolData.address || schoolData.location}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location/City</Label>
                {isEditing ? (
                  <Input
                    id="location"
                    value={editData?.location || ""}
                    onChange={(e) => setEditData({ ...editData!, location: e.target.value })}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">{schoolData.location}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                {isEditing ? (
                  <Input
                    id="phone"
                    value={editData?.phone || ""}
                    onChange={(e) => setEditData({ ...editData!, phone: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Phone className="mr-2 h-4 w-4" />
                    {schoolData.phone}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                {isEditing ? (
                  <Input
                    id="email"
                    type="email"
                    value={editData?.email || ""}
                    onChange={(e) => setEditData({ ...editData!, email: e.target.value })}
                  />
                ) : (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Mail className="mr-2 h-4 w-4" />
                    {schoolData.email}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="principal">Principal</Label>
                {isEditing ? (
                  <Input
                    id="principal"
                    value={editData?.principal_name || ""}
                    onChange={(e) => setEditData({ ...editData!, principal_name: e.target.value })}
                    placeholder="Enter principal's name"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {schoolData.principal_name || "Not specified"}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="established">Year Established</Label>
                {isEditing ? (
                  <Input
                    id="established"
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    value={editData?.established_year || ""}
                    onChange={(e) => setEditData({ 
                      ...editData!, 
                      established_year: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="Enter year"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {schoolData.established_year || "Not specified"}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Info for non-admins */}
        {!canEdit && (
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-blue-100 p-2">
                  <School className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-blue-900">Need to Update Information?</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Contact your school administrator to make changes to the school information. 
                    Only administrators can edit these details to maintain data integrity.
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

export default SchoolInfo;
