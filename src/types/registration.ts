
import { Curriculum } from "@/services/curriculumService";

export interface PersonalInfo {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface SchoolInfo {
  name: string;
  country: string;
  county: string;
  town: string;
  address: string;
  motto: string;
  vision: string;
}

export interface CurriculumInfo {
  type: Curriculum;
  grades: string[];
  subjects: string[];
  selectedGrades: string[];
  selectedSubjects: string[];
}

export type RegistrationStep = {
  title: string;
  description?: string;
};
