
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface CreateSchoolFormProps {
  initialData?: {
    name: string;
    location: string;
    email: string;
  };
  isLoading: boolean;
  onSubmit: (data: {
    name: string;
    location: string;
    phone: string;
    email: string;
  }) => void;
}

export const CreateSchoolForm = ({ initialData, isLoading, onSubmit }: CreateSchoolFormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    location: initialData?.location || "",
    phone: "",
    email: initialData?.email || ""
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Your School</CardTitle>
        <CardDescription>
          Enter your school details to complete the registration
        </CardDescription>
      </CardHeader>
      
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolName">School Name</Label>
            <Input
              id="schoolName"
              placeholder="e.g. St. Mary's Academy"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="e.g. Nairobi, Kenya"
              value={formData.location}
              onChange={(e) => handleInputChange("location", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="e.g. +254 700 123456"
              value={formData.phone}
              onChange={(e) => handleInputChange("phone", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">School Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="e.g. info@school.com"
              value={formData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
        </CardContent>

        <CardFooter>
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating School...
              </>
            ) : (
              "Create School"
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};
