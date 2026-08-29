
import { useState } from "react";
import { PersonalInfo, SchoolInfo, CurriculumInfo, RegistrationStep } from "@/types/registration";

export const useRegistrationState = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [personalInfo, setPersonalInfo] = useState<PersonalInfo>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: ""
  });
  
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    name: "",
    country: "Kenya",
    county: "",
    town: "",
    address: "",
    motto: "",
    vision: ""
  });
  
  const [curriculumInfo, setCurriculumInfo] = useState<CurriculumInfo>({
    type: "cbc",
    grades: [],
    subjects: [],
    selectedGrades: [],
    selectedSubjects: []
  });

  const steps: RegistrationStep[] = [
    { title: "Personal Details", description: "Create your admin account" },
    { title: "School Information", description: "Enter your school details" },
    { title: "Curriculum", description: "Select curriculum and subjects" },
    { title: "Review", description: "Confirm your information" }
  ];

  return {
    currentStep,
    setCurrentStep,
    isSubmitting,
    setIsSubmitting,
    personalInfo,
    setPersonalInfo,
    schoolInfo,
    setSchoolInfo,
    curriculumInfo,
    setCurriculumInfo,
    steps
  };
};
