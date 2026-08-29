
import { useState } from "react";
import { PersonalInfo } from "@/types/registration";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sanitizeInput, sanitizeEmail, sanitizePhone } from "@/utils/sanitize";

interface PersonalDetailsStepProps {
  personalInfo: PersonalInfo;
  onInfoChange: (info: PersonalInfo) => void;
  onNext: () => void;
  isSubmitting: boolean;
}

export const PersonalDetailsStep = ({
  personalInfo,
  onInfoChange,
  onNext,
  isSubmitting
}: PersonalDetailsStepProps) => {
  const [errors, setErrors] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  const validate = () => {
    const newErrors = {
      name: "",
      email: "",
      password: "",
      confirmPassword: ""
    };
    
    if (!personalInfo.name) newErrors.name = "Name is required";
    if (!personalInfo.email) newErrors.email = "Email is required";
    if (!/^\S+@\S+\.\S+$/.test(personalInfo.email)) newErrors.email = "Invalid email format";
    
    if (!personalInfo.password) newErrors.password = "Password is required";
    if (personalInfo.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    
    if (personalInfo.password !== personalInfo.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
    }
    
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleNext = () => {
    if (validate()) {
      // Sanitize before passing upstream
      onInfoChange({
        ...personalInfo,
        name: sanitizeInput(personalInfo.name),
        email: sanitizeEmail(personalInfo.email),
        phone: sanitizePhone(personalInfo.phone),
      });
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Personal Details</CardTitle>
        <CardDescription>Create your administrator account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name</Label>
          <Input
            id="name"
            value={personalInfo.name}
            onChange={(e) => onInfoChange({...personalInfo, name: e.target.value})}
            placeholder="John Doe"
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={personalInfo.email}
            onChange={(e) => onInfoChange({...personalInfo, email: e.target.value})}
            placeholder="john@example.com"
          />
          {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number (Optional)</Label>
          <Input
            id="phone"
            value={personalInfo.phone}
            onChange={(e) => onInfoChange({...personalInfo, phone: e.target.value})}
            placeholder="+254 700 123456"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            value={personalInfo.password}
            onChange={(e) => onInfoChange({...personalInfo, password: e.target.value})}
            placeholder="Create a secure password"
          />
          {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={personalInfo.confirmPassword}
            onChange={(e) => onInfoChange({...personalInfo, confirmPassword: e.target.value})}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button 
          onClick={handleNext}
          disabled={isSubmitting}
        >
          Next Step
        </Button>
      </CardFooter>
    </Card>
  );
};
