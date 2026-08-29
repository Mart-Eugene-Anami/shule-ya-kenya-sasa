import { useState, useEffect } from "react";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Mark, Student, Exam } from "@/types";
import { X } from "lucide-react";

const markSchema = z.object({
  studentId: z.string().uuid("Please select a student"),
  examId: z.string().uuid("Please select an exam"),
  subject: z.string().min(1, "Please select a subject"),
  score: z.coerce.number()
    .min(0, "Score cannot be negative")
    .max(100, "Score cannot exceed 100"),
  outOf: z.coerce.number().default(100),
});

type MarkFormValues = z.infer<typeof markSchema>;

interface MarkEntryFormProps {
  students: Student[];
  exams: Exam[];
  subjects: string[];
  onSubmit: (values: MarkFormValues) => Promise<void>;
  initialValues?: Partial<Mark>;
  mode?: "create" | "edit";
  onCancel?: () => void;
}

export function MarkEntryForm({
  students,
  exams,
  subjects,
  onSubmit,
  initialValues,
  mode = "create",
  onCancel
}: MarkEntryFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<MarkFormValues>({
    resolver: zodResolver(markSchema),
    defaultValues: {
      studentId: initialValues?.studentId || "",
      examId: initialValues?.examId || "",
      subject: initialValues?.subject || "",
      score: initialValues?.score || 0,
      outOf: initialValues?.outOf || 100,
    },
  });

  const handleSubmit = async (values: MarkFormValues) => {
    try {
      setIsSubmitting(true);
      await onSubmit(values);
      
      if (mode === "create") {
        toast({
          title: "Mark saved",
          description: "Student mark has been successfully recorded.",
        });
        
        // Reset form for new entry but keep exam and subject
        const examId = form.getValues("examId");
        const subject = form.getValues("subject");
        form.reset({ examId, subject, studentId: "", score: 0, outOf: 100 });
      } else {
        toast({
          title: "Mark updated",
          description: "Student mark has been successfully updated.",
        });
        
        if (onCancel) onCancel();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save mark. Please try again.",
        variant: "destructive",
      });
      console.error("Failed to save mark:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {mode === "create" ? "Enter Student Marks" : "Edit Student Mark"}
        </CardTitle>
        <CardDescription>
          {mode === "create" 
            ? "Record marks for student assessments" 
            : "Update the existing mark record"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="examId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value} 
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select exam" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {exams.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id}>
                            {exam.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="subject"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subject</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isSubmitting}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select subject" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Student</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      defaultValue={field.value}
                      disabled={isSubmitting} 
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name} ({student.admissionNo})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2">
                <FormField
                  control={form.control}
                  name="score"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormLabel>Score</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="0"
                          max="100"
                          placeholder="0" 
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="outOf"
                  render={({ field }) => (
                    <FormItem className="w-24">
                      <FormLabel>Out of</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          min="1"
                          placeholder="100" 
                          {...field}
                          disabled={isSubmitting}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>
            
            <CardFooter className="flex justify-end space-x-2 px-0 pt-4">
              {mode === "edit" && onCancel && (
                <Button 
                  variant="outline" 
                  type="button" 
                  onClick={onCancel}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
              )}
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : mode === "create" ? "Save Mark" : "Update Mark"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
