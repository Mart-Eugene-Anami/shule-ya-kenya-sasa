 import React, { useState, useEffect } from "react";
 import { useAuth } from "@/contexts/AuthContext";
 import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
 import { Button } from "@/components/ui/button";
 import { Badge } from "@/components/ui/badge";
 import { Input } from "@/components/ui/input";
 import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogFooter,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import { Alert, AlertDescription } from "@/components/ui/alert";
 import { ScrollArea } from "@/components/ui/scroll-area";
 import { Separator } from "@/components/ui/separator";
 import {
   Plus,
   Trash2,
   Edit,
   Save,
   X,
   BookOpen,
   Loader2,
   Info,
   GraduationCap,
 } from "lucide-react";
 import { toast } from "@/hooks/use-toast";
 import { supabase } from "@/integrations/supabase/client";
 import {
   createSubject,
   updateSubject,
   deleteSubject,
   type SchoolSubject,
   type SubjectType,
 } from "@/services/subjectService";
 import { cbcSeniorPathways, type CBCSeniorPathway } from "@/services/curriculumService";
 
 interface CBCSeniorSubjectManagerProps {
   divisionId: string;
   readOnly?: boolean;
 }
 
 export function CBCSeniorSubjectManager({ divisionId, readOnly = false }: CBCSeniorSubjectManagerProps) {
   const { user } = useAuth();
   const [subjects, setSubjects] = useState<SchoolSubject[]>([]);
   const [loading, setLoading] = useState(true);
   const [activeTab, setActiveTab] = useState<"core" | CBCSeniorPathway>("core");
 
   // Dialog states
   const [showAddDialog, setShowAddDialog] = useState(false);
   const [editingSubject, setEditingSubject] = useState<SchoolSubject | null>(null);
 
   // Form states
   const [subjectName, setSubjectName] = useState("");
   const [subjectType, setSubjectType] = useState<SubjectType>("core");
   const [pathway, setPathway] = useState<CBCSeniorPathway | "">("");
 
   useEffect(() => {
     if (user?.schoolId && divisionId) {
       fetchSubjects();
     }
   }, [user?.schoolId, divisionId]);
 
   const fetchSubjects = async () => {
     if (!user?.schoolId) return;
 
     try {
       setLoading(true);
       const { data, error } = await supabase
         .from("subjects")
         .select("*")
         .eq("school_id", user.schoolId)
         .eq("division_id", divisionId)
         .eq("is_active", true)
         .order("subject_type")
         .order("name");
 
       if (error) throw error;
       setSubjects(data as SchoolSubject[]);
     } catch (error) {
       console.error("Error fetching subjects:", error);
       toast({
         title: "Error",
         description: "Failed to load subjects",
         variant: "destructive",
       });
     } finally {
       setLoading(false);
     }
   };
 
   const handleAddSubject = async () => {
     if (!user?.schoolId || !subjectName.trim()) {
       toast({
         title: "Error",
         description: "Please provide a subject name",
         variant: "destructive",
       });
       return;
     }
 
     if (subjectType !== "core" && !pathway) {
       toast({
         title: "Error",
         description: "Please select a pathway for optional subjects",
         variant: "destructive",
       });
       return;
     }
 
     try {
       await createSubject(
         user.schoolId,
         subjectName.trim(),
         "cbc-senior",
         divisionId,
         subjectType,
         subjectType === "core" ? null : (pathway as CBCSeniorPathway)
       );
 
       toast({ title: "Subject Added", description: `${subjectName} has been added.` });
       resetForm();
       setShowAddDialog(false);
       fetchSubjects();
     } catch (error: any) {
       toast({
         title: "Error",
         description: error.message || "Failed to add subject",
         variant: "destructive",
       });
     }
   };
 
   const handleUpdateSubject = async () => {
     if (!editingSubject || !subjectName.trim()) return;
 
     try {
       await updateSubject(editingSubject.id, {
         name: subjectName.trim(),
         subject_type: subjectType,
         pathway: subjectType === "core" ? null : pathway || null,
       });
 
       toast({ title: "Subject Updated" });
       resetForm();
       setEditingSubject(null);
       fetchSubjects();
     } catch (error: any) {
       toast({
         title: "Error",
         description: error.message || "Failed to update subject",
         variant: "destructive",
       });
     }
   };
 
   const handleDeleteSubject = async (subject: SchoolSubject) => {
     if (!confirm(`Are you sure you want to delete "${subject.name}"?`)) return;
 
     try {
       await deleteSubject(subject.id);
       toast({ title: "Subject Deleted" });
       fetchSubjects();
     } catch (error: any) {
       toast({
         title: "Error",
         description: error.message || "Failed to delete subject",
         variant: "destructive",
       });
     }
   };
 
   const openEditDialog = (subject: SchoolSubject) => {
     setEditingSubject(subject);
     setSubjectName(subject.name);
     setSubjectType(subject.subject_type as SubjectType || "core");
     setPathway((subject.pathway as CBCSeniorPathway) || "");
   };
 
   const resetForm = () => {
     setSubjectName("");
     setSubjectType("core");
     setPathway("");
   };
 
   const coreSubjects = subjects.filter((s) => s.subject_type === "core");
   const getOptionalSubjects = (p: CBCSeniorPathway) =>
     subjects.filter((s) => s.subject_type !== "core" && s.pathway === p);
 
   if (loading) {
     return (
       <div className="flex items-center justify-center p-8">
         <Loader2 className="h-8 w-8 animate-spin text-primary" />
       </div>
     );
   }
 
   return (
     <div className="space-y-4">
       <div className="flex items-center justify-between">
         <div>
           <h3 className="text-lg font-semibold flex items-center gap-2">
             <GraduationCap className="h-5 w-5" />
             CBE Senior Subjects
           </h3>
           <p className="text-sm text-muted-foreground">
             Configure core subjects (for all students) and optional subjects (by pathway).
           </p>
         </div>
         {!readOnly && (
           <Button onClick={() => setShowAddDialog(true)}>
             <Plus className="h-4 w-4 mr-2" />
             Add Subject
           </Button>
         )}
       </div>
 
       <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
         <TabsList>
           <TabsTrigger value="core">
             Core Subjects ({coreSubjects.length})
           </TabsTrigger>
           {cbcSeniorPathways.map((p) => (
             <TabsTrigger key={p.value} value={p.value}>
               {p.label} ({getOptionalSubjects(p.value).length})
             </TabsTrigger>
           ))}
         </TabsList>
 
         <TabsContent value="core">
           <Card>
             <CardHeader>
               <CardTitle className="text-base">Core/Compulsory Subjects</CardTitle>
               <CardDescription>
                 These subjects are taken by all CBE Senior students regardless of pathway.
               </CardDescription>
             </CardHeader>
             <CardContent>
               <SubjectList
                 subjects={coreSubjects}
                 readOnly={readOnly}
                 onEdit={openEditDialog}
                 onDelete={handleDeleteSubject}
               />
             </CardContent>
           </Card>
         </TabsContent>
 
         {cbcSeniorPathways.map((p) => (
           <TabsContent key={p.value} value={p.value}>
             <Card>
               <CardHeader>
                 <CardTitle className="text-base">{p.label} Optional Subjects</CardTitle>
                 <CardDescription>{p.description}</CardDescription>
               </CardHeader>
               <CardContent>
                 <SubjectList
                   subjects={getOptionalSubjects(p.value)}
                   readOnly={readOnly}
                   onEdit={openEditDialog}
                   onDelete={handleDeleteSubject}
                   emptyMessage={`No optional subjects for ${p.label} pathway. Add subjects to create tracks.`}
                 />
               </CardContent>
             </Card>
           </TabsContent>
         ))}
       </Tabs>
 
       {/* Add/Edit Subject Dialog */}
       <Dialog
         open={showAddDialog || !!editingSubject}
         onOpenChange={(open) => {
           if (!open) {
             setShowAddDialog(false);
             setEditingSubject(null);
             resetForm();
           }
         }}
       >
         <DialogContent className="max-w-md">
           <DialogHeader>
             <DialogTitle>
               {editingSubject ? "Edit Subject" : "Add New Subject"}
             </DialogTitle>
           </DialogHeader>
 
           <div className="space-y-4 py-4">
             <div className="space-y-2">
               <label className="text-sm font-medium">Subject Name</label>
               <Input
                 placeholder="e.g., Physics"
                 value={subjectName}
                 onChange={(e) => setSubjectName(e.target.value)}
               />
             </div>
 
             <div className="space-y-2">
               <label className="text-sm font-medium">Subject Type</label>
               <Select
                 value={subjectType}
                 onValueChange={(v) => {
                   setSubjectType(v as SubjectType);
                   if (v === "core") setPathway("");
                 }}
               >
                 <SelectTrigger>
                   <SelectValue />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="core">Core (Compulsory)</SelectItem>
                   <SelectItem value="optional">Optional</SelectItem>
                   <SelectItem value="elective">Elective</SelectItem>
                 </SelectContent>
               </Select>
             </div>
 
             {subjectType !== "core" && (
               <div className="space-y-2">
                 <label className="text-sm font-medium">Pathway</label>
                 <Select value={pathway} onValueChange={(v) => setPathway(v as CBCSeniorPathway)}>
                   <SelectTrigger>
                     <SelectValue placeholder="Select pathway" />
                   </SelectTrigger>
                   <SelectContent>
                     {cbcSeniorPathways.map((p) => (
                       <SelectItem key={p.value} value={p.value}>
                         {p.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
             )}
           </div>
 
           <DialogFooter>
             <Button
               variant="outline"
               onClick={() => {
                 setShowAddDialog(false);
                 setEditingSubject(null);
                 resetForm();
               }}
             >
               Cancel
             </Button>
             <Button
               onClick={editingSubject ? handleUpdateSubject : handleAddSubject}
               disabled={!subjectName.trim() || (subjectType !== "core" && !pathway)}
             >
               {editingSubject ? "Update Subject" : "Add Subject"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>
     </div>
   );
 }
 
 // Internal component for subject list
 function SubjectList({
   subjects,
   readOnly,
   onEdit,
   onDelete,
   emptyMessage = "No subjects configured.",
 }: {
   subjects: SchoolSubject[];
   readOnly: boolean;
   onEdit: (s: SchoolSubject) => void;
   onDelete: (s: SchoolSubject) => void;
   emptyMessage?: string;
 }) {
   if (subjects.length === 0) {
     return (
       <div className="text-center py-8 text-muted-foreground">
         <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
         <p>{emptyMessage}</p>
       </div>
     );
   }
 
   return (
     <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
       {subjects.map((subject) => (
         <div
           key={subject.id}
           className="flex items-center justify-between p-3 bg-muted/50 rounded-lg group"
         >
           <div className="flex items-center gap-2">
             <span className="text-sm font-medium">{subject.name}</span>
             {subject.subject_type !== "core" && (
               <Badge variant="outline" className="text-xs">
                 {subject.subject_type}
               </Badge>
             )}
           </div>
           {!readOnly && (
             <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
               <Button size="sm" variant="ghost" onClick={() => onEdit(subject)}>
                 <Edit className="h-3 w-3" />
               </Button>
               <Button
                 size="sm"
                 variant="ghost"
                 className="text-destructive hover:text-destructive"
                 onClick={() => onDelete(subject)}
               >
                 <Trash2 className="h-3 w-3" />
               </Button>
             </div>
           )}
         </div>
       ))}
     </div>
   );
 }