import { useState } from "react";
import { Student } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserPlus, Copy, Check, AlertCircle } from "lucide-react";
import { createStudentAccount, generateDefaultPassword } from "@/services/studentAccountService";
import { useToast } from "@/hooks/use-toast";

interface CreateStudentAccountDialogProps {
  student: Student | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onAccountCreated?: () => void;
}

const CreateStudentAccountDialog = ({
  student,
  isOpen,
  onOpenChange,
  onAccountCreated,
}: CreateStudentAccountDialogProps) => {
  const [email, setEmail] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleOpen = (open: boolean) => {
    if (open && student) {
      setEmail(student.email || "");
      setCreatedCredentials(null);
      setCopied(false);
    }
    onOpenChange(open);
  };

  const handleCreateAccount = async () => {
    if (!student || !email) return;

    setIsCreating(true);
    try {
      const password = generateDefaultPassword(student.name);
      
      const result = await createStudentAccount({
        studentId: student.id,
        email,
        password,
        name: student.name,
        schoolId: student.schoolId,
      });

      if (result.success) {
        setCreatedCredentials({ email, password });
        toast({
          title: "Account Created",
          description: `Login credentials created for ${student.name}`,
        });
        onAccountCreated?.();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to create account",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error creating student account:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyCredentials = () => {
    if (createdCredentials) {
      const text = `Email: ${createdCredentials.email}\nPassword: ${createdCredentials.password}`;
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!student) return null;

  const hasExistingAccount = !!student.userId;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create Student Account
          </DialogTitle>
          <DialogDescription>
            Create login credentials for {student.name}
          </DialogDescription>
        </DialogHeader>

        {hasExistingAccount ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              This student already has an account linked.
            </AlertDescription>
          </Alert>
        ) : createdCredentials ? (
          <div className="space-y-4">
            <Alert className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-green-800 dark:text-green-200">
                Account created successfully!
              </AlertDescription>
            </Alert>

            <div className="space-y-3 p-4 bg-muted rounded-lg">
              <div>
                <Label className="text-xs text-muted-foreground">Email</Label>
                <p className="font-mono text-sm">{createdCredentials.email}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Password</Label>
                <p className="font-mono text-sm">{createdCredentials.password}</p>
              </div>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={copyCredentials}
            >
              {copied ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy Credentials
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Share these credentials with the student. They can change their password after logging in.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                The password will be the student's full name in lowercase with no spaces.
                <br />
                <span className="font-mono text-xs mt-1 block">
                  Example: "{student.name}" → "{generateDefaultPassword(student.name)}"
                </span>
              </AlertDescription>
            </Alert>
          </div>
        )}

        <DialogFooter>
          {createdCredentials ? (
            <Button onClick={() => handleOpen(false)}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => handleOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleCreateAccount}
                disabled={isCreating || !email || hasExistingAccount}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Create Account
                  </>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateStudentAccountDialog;
