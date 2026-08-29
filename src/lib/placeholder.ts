
export interface School {
  id: string;
  name: string;
  location: string;
  phone: string;
  email: string;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

// Example school data for demonstration
export const schoolData: School = {
  id: "1",
  name: "St. Mary's Academy",
  location: "Nairobi, Kenya",
  phone: "+254 700 123456",
  email: "info@stmarys.ac.ke",
  adminId: "1",
  createdAt: "2023-01-01T00:00:00.000Z",
  updatedAt: "2023-01-01T00:00:00.000Z",
};

// CSV helpers
export const generateStudentCsv = () => {
  const header = "admissionNo,name,email,grade,stream";
  const rows = [
    "001,John Kamau,john@example.com,Grade 5,Red",
    "002,Mary Wanjiru,mary@example.com,Grade 5,Blue",
    "003,James Maina,james@example.com,Form 1,Yellow"
  ];
  
  return [header, ...rows].join("\n");
};

export const generateTeacherCsv = () => {
  const header = "name,email,subject";
  const rows = [
    "Jane Wambui,jane@school.com,Mathematics",
    "John Njoroge,john@school.com,Science",
    "Sarah Odhiambo,sarah@school.com,English"
  ];
  
  return [header, ...rows].join("\n");
};
