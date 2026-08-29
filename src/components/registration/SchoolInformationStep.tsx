
import { useState } from "react";
import { SchoolInfo } from "@/types/registration";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SchoolInformationStepProps {
  schoolInfo: SchoolInfo;
  onInfoChange: (info: SchoolInfo) => void;
  onNext: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export const SchoolInformationStep = ({
  schoolInfo,
  onInfoChange,
  onNext,
  onBack,
  isSubmitting
}: SchoolInformationStepProps) => {
  const [errors, setErrors] = useState({
    name: ""
  });

  const validate = () => {
    const newErrors = { name: "" };
    if (!schoolInfo.name) newErrors.name = "School name is required";
    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error);
  };

  const handleNext = () => {
    if (validate()) {
      onNext();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>School Information</CardTitle>
        <CardDescription>Tell us about your school</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="schoolName">School Name</Label>
          <Input
            id="schoolName"
            value={schoolInfo.name}
            onChange={(e) => onInfoChange({...schoolInfo, name: e.target.value})}
            placeholder="e.g. St. Mary's Academy"
          />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input
              id="country"
              value={schoolInfo.country}
              onChange={(e) => onInfoChange({...schoolInfo, country: e.target.value})}
              placeholder="Kenya"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="county">County</Label>
            <Input
              id="county"
              value={schoolInfo.county}
              onChange={(e) => onInfoChange({...schoolInfo, county: e.target.value})}
              placeholder="e.g. Nairobi"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="town">Town/City</Label>
            <Input
              id="town"
              value={schoolInfo.town}
              onChange={(e) => onInfoChange({...schoolInfo, town: e.target.value})}
              placeholder="e.g. Westlands"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Physical Address</Label>
          <Textarea
            id="address"
            value={schoolInfo.address}
            onChange={(e) => onInfoChange({...schoolInfo, address: e.target.value})}
            placeholder="e.g. Plot 123, School Lane"
            rows={2}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="motto">School Motto (Optional)</Label>
          <Input
            id="motto"
            value={schoolInfo.motto}
            onChange={(e) => onInfoChange({...schoolInfo, motto: e.target.value})}
            placeholder="e.g. Excellence in Education"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="vision">School Vision (Optional)</Label>
          <Textarea
            id="vision"
            value={schoolInfo.vision}
            onChange={(e) => onInfoChange({...schoolInfo, vision: e.target.value})}
            placeholder="e.g. To be a leading center of educational excellence..."
            rows={2}
          />
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button 
          variant="outline" 
          onClick={onBack}
        >
          Previous
        </Button>
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
