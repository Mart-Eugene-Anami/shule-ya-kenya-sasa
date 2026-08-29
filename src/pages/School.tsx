
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Building, Mail, Phone, MapPin } from "lucide-react";

const School = () => {
  const [isEditing, setIsEditing] = useState(false);
  const [school, setSchool] = useState({
    name: "St. Mary's Academy",
    location: "Nairobi, Kenya",
    phone: "+254 700 123456",
    email: "info@stmarys.ac.ke",
    principal: "Dr. Jane Wanjiku",
    founded: "1985",
    website: "www.stmarys.ac.ke",
  });

  const [form, setForm] = useState({ ...school });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSchool({ ...form });
    setIsEditing(false);
    toast.success("School information updated successfully");
  };

  return (
    <DashboardLayout title="School Information">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="lg:col-span-2">
          <CardHeader className="space-y-1">
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl">School Details</CardTitle>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  className="text-school-primary"
                >
                  Edit Details
                </Button>
              )}
            </div>
            <CardDescription>
              View and manage your school's information
            </CardDescription>
          </CardHeader>

          {!isEditing ? (
            <CardContent className="grid gap-6">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                <div className="bg-school-primary/10 rounded-full p-3">
                  <Building className="h-6 w-6 text-school-primary" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    {school.name}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Founded in {school.founded}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid gap-4 md:grid-cols-2">
                <div className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium leading-none mb-1">Location</p>
                    <p className="text-sm text-muted-foreground">{school.location}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium leading-none mb-1">Phone</p>
                    <p className="text-sm text-muted-foreground">{school.phone}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium leading-none mb-1">Email</p>
                    <p className="text-sm text-muted-foreground">{school.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium leading-none mb-1">Principal</p>
                    <p className="text-sm text-muted-foreground">{school.principal}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">School Name</Label>
                    <Input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="founded">Founded Year</Label>
                    <Input
                      id="founded"
                      name="founded"
                      value={form.founded}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      value={form.location}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={form.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">Website</Label>
                    <Input
                      id="website"
                      name="website"
                      value={form.website}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="principal">Principal</Label>
                    <Input
                      id="principal"
                      name="principal"
                      value={form.principal}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setForm({ ...school });
                    setIsEditing(false);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-school-primary hover:bg-school-secondary">
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default School;
