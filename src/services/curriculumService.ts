
export type Curriculum = "cbc" | "cbc-senior" | "8-4-4" | "custom";

export type CBCSeniorPathway = "stem" | "arts_sports" | "social_sciences";

export interface Grade {
  id: string;
  name: string;
  level: number;
  curriculum: Curriculum;
}

export type SubjectTypeDefault = "core" | "optional";

export interface Subject {
  id: string;
  name: string;
  curriculum: Curriculum;
  subjectType: SubjectTypeDefault;
  pathway?: CBCSeniorPathway | "core"; // For CBE Senior subjects
}

export const cbcSeniorPathways: { value: CBCSeniorPathway; label: string; description: string }[] = [
  { value: "stem", label: "STEM", description: "Science, Technology, Engineering & Mathematics" },
  { value: "arts_sports", label: "Arts & Sports Science", description: "Creative Arts, Music, Theatre & Physical Education" },
  { value: "social_sciences", label: "Social Sciences", description: "Business, Economics & Government Studies" },
];

// Check if a grade level requires pathway selection (Grade 10-12)
export const requiresPathway = (gradeName: string): boolean => {
  const level = parseInt(gradeName.replace(/\D/g, ''));
  return gradeName.toLowerCase().includes('grade') && level >= 10 && level <= 12;
};

// CBE Grades (Primary & Junior Secondary: Grade 1-9)
const cbcGrades: Grade[] = [
  { id: "cbc-1", name: "Grade 1", level: 1, curriculum: "cbc" },
  { id: "cbc-2", name: "Grade 2", level: 2, curriculum: "cbc" },
  { id: "cbc-3", name: "Grade 3", level: 3, curriculum: "cbc" },
  { id: "cbc-4", name: "Grade 4", level: 4, curriculum: "cbc" },
  { id: "cbc-5", name: "Grade 5", level: 5, curriculum: "cbc" },
  { id: "cbc-6", name: "Grade 6", level: 6, curriculum: "cbc" },
  { id: "cbc-7", name: "Grade 7", level: 7, curriculum: "cbc" },
  { id: "cbc-8", name: "Grade 8", level: 8, curriculum: "cbc" },
  { id: "cbc-9", name: "Grade 9", level: 9, curriculum: "cbc" },
];

// CBE Senior Secondary Grades (Grade 10-12) - Effective Jan 2026
const cbcSeniorGrades: Grade[] = [
  { id: "cbc-senior-10", name: "Grade 10", level: 10, curriculum: "cbc-senior" },
  { id: "cbc-senior-11", name: "Grade 11", level: 11, curriculum: "cbc-senior" },
  { id: "cbc-senior-12", name: "Grade 12", level: 12, curriculum: "cbc-senior" },
];

// 8-4-4 Grades (Forms 1-4)
const oldCurriculumGrades: Grade[] = [
  { id: "844-1", name: "Form 1", level: 1, curriculum: "8-4-4" },
  { id: "844-2", name: "Form 2", level: 2, curriculum: "8-4-4" },
  { id: "844-3", name: "Form 3", level: 3, curriculum: "8-4-4" },
  { id: "844-4", name: "Form 4", level: 4, curriculum: "8-4-4" },
];

// CBE Subjects - Primary & Junior Secondary (Grade 1-9)
// Lower Primary (Grade 1-3): ALL subjects are core (compulsory activity-based learning)
// Upper Primary (Grade 4-6): ALL subjects are core (compulsory)
// Junior Secondary (Grade 7-9): Core subjects are compulsory; optional subjects are elective choices
const cbcSubjects: Subject[] = [
  // Lower Primary (Grade 1-3) - All core/compulsory
  { id: "cbc-s1", name: "Literacy Activities", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s2", name: "Kiswahili Activities", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s3", name: "Mathematical Activities", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s4", name: "Environmental Activities", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s5", name: "Hygiene and Nutrition Activities", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s6", name: "Religious Education", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s7", name: "Movement and Creative Activities", curriculum: "cbc", subjectType: "core" },
  
  // Upper Primary (Grade 4-6) - All core/compulsory
  { id: "cbc-s8", name: "English", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s9", name: "Kiswahili", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s10", name: "Mathematics", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s11", name: "Integrated Science", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s12", name: "Social Studies", curriculum: "cbc", subjectType: "core" },
  { id: "cbc-s16", name: "Physical Health Education", curriculum: "cbc", subjectType: "core" },
  
  // Junior Secondary (Grade 7-9) - Core
  // (English, Kiswahili, Mathematics, Integrated Science, Social Studies, RE, PHE are core)
  // Optional subjects for Junior Secondary
  { id: "cbc-s13", name: "Agriculture", curriculum: "cbc", subjectType: "optional" },
  { id: "cbc-s14", name: "Creative Arts", curriculum: "cbc", subjectType: "optional" },
  { id: "cbc-s15", name: "Home Science", curriculum: "cbc", subjectType: "optional" },
  { id: "cbc-s17", name: "Business Studies", curriculum: "cbc", subjectType: "optional" },
  { id: "cbc-s18", name: "Pre-Technical Studies", curriculum: "cbc", subjectType: "optional" },
];

// CBE Senior Secondary Subjects (Grade 10-12) - Three Pathways
// Core subjects (pathway: "core") are compulsory for ALL students
// Pathway subjects are optional - students choose based on their pathway/track
const cbcSeniorSubjects: Subject[] = [
  // Core/Compulsory Subjects for all pathways
  { id: "cbc-sr-s1", name: "English", curriculum: "cbc-senior", subjectType: "core", pathway: "core" },
  { id: "cbc-sr-s2", name: "Kiswahili", curriculum: "cbc-senior", subjectType: "core", pathway: "core" },
  { id: "cbc-sr-s3", name: "Mathematics", curriculum: "cbc-senior", subjectType: "core", pathway: "core" },
  { id: "cbc-sr-s4", name: "Religious Education", curriculum: "cbc-senior", subjectType: "core", pathway: "core" },
  { id: "cbc-sr-s5", name: "Community Service Learning", curriculum: "cbc-senior", subjectType: "core", pathway: "core" },
  { id: "cbc-sr-s6", name: "Health Education", curriculum: "cbc-senior", subjectType: "core", pathway: "core" },
  { id: "cbc-sr-s7", name: "Life Skills", curriculum: "cbc-senior", subjectType: "core", pathway: "core" },
  
  // Sciences - STEM Pathway (optional - pathway-specific)
  { id: "cbc-sr-s8", name: "Biology", curriculum: "cbc-senior", subjectType: "optional", pathway: "stem" },
  { id: "cbc-sr-s9", name: "Chemistry", curriculum: "cbc-senior", subjectType: "optional", pathway: "stem" },
  { id: "cbc-sr-s10", name: "Physics", curriculum: "cbc-senior", subjectType: "optional", pathway: "stem" },
  { id: "cbc-sr-s11", name: "Computer Science", curriculum: "cbc-senior", subjectType: "optional", pathway: "stem" },
  { id: "cbc-sr-s12", name: "Agriculture", curriculum: "cbc-senior", subjectType: "optional", pathway: "stem" },
  
  // Arts & Sports Science Pathway (optional - pathway-specific)
  { id: "cbc-sr-s13", name: "History", curriculum: "cbc-senior", subjectType: "optional", pathway: "arts_sports" },
  { id: "cbc-sr-s14", name: "Geography", curriculum: "cbc-senior", subjectType: "optional", pathway: "arts_sports" },
  { id: "cbc-sr-s15", name: "Music", curriculum: "cbc-senior", subjectType: "optional", pathway: "arts_sports" },
  { id: "cbc-sr-s16", name: "Theatre Arts", curriculum: "cbc-senior", subjectType: "optional", pathway: "arts_sports" },
  { id: "cbc-sr-s17", name: "Visual Arts", curriculum: "cbc-senior", subjectType: "optional", pathway: "arts_sports" },
  { id: "cbc-sr-s18", name: "Physical Education", curriculum: "cbc-senior", subjectType: "optional", pathway: "arts_sports" },
  { id: "cbc-sr-s19", name: "Sports Science", curriculum: "cbc-senior", subjectType: "optional", pathway: "arts_sports" },
  
  // Social Sciences Pathway (optional - pathway-specific)
  { id: "cbc-sr-s20", name: "Business Studies", curriculum: "cbc-senior", subjectType: "optional", pathway: "social_sciences" },
  { id: "cbc-sr-s21", name: "Economics", curriculum: "cbc-senior", subjectType: "optional", pathway: "social_sciences" },
  { id: "cbc-sr-s22", name: "Government & Citizenship", curriculum: "cbc-senior", subjectType: "optional", pathway: "social_sciences" },
  
  // Languages - Available to all pathways (optional electives)
  { id: "cbc-sr-s23", name: "French", curriculum: "cbc-senior", subjectType: "optional", pathway: "core" },
  { id: "cbc-sr-s24", name: "German", curriculum: "cbc-senior", subjectType: "optional", pathway: "core" },
  { id: "cbc-sr-s25", name: "Arabic", curriculum: "cbc-senior", subjectType: "optional", pathway: "core" },
  { id: "cbc-sr-s26", name: "Mandarin", curriculum: "cbc-senior", subjectType: "optional", pathway: "core" },
  { id: "cbc-sr-s27", name: "Indigenous Languages", curriculum: "cbc-senior", subjectType: "optional", pathway: "core" },
  
  // Technical & Applied Sciences - Available to STEM pathway (optional)
  { id: "cbc-sr-s28", name: "Home Science", curriculum: "cbc-senior", subjectType: "optional", pathway: "stem" },
  { id: "cbc-sr-s29", name: "Drawing & Design", curriculum: "cbc-senior", subjectType: "optional", pathway: "stem" },
  { id: "cbc-sr-s30", name: "Aviation Technology", curriculum: "cbc-senior", subjectType: "optional", pathway: "stem" },
  { id: "cbc-sr-s31", name: "Marine Technology", curriculum: "cbc-senior", subjectType: "optional", pathway: "stem" },
];

// Get subjects filtered by pathway (includes core subjects for all pathways)
export const getSubjectsByPathway = (pathway: CBCSeniorPathway): Subject[] => {
  return cbcSeniorSubjects.filter(s => s.pathway === "core" || s.pathway === pathway);
};

// 8-4-4 Subjects
// In the 8-4-4 system: Mathematics, English, and Kiswahili are compulsory for all students.
// Other subjects are offered by the school but students choose a subset (optional/elective).
const oldCurriculumSubjects: Subject[] = [
  { id: "844-s1", name: "Mathematics", curriculum: "8-4-4", subjectType: "core" },
  { id: "844-s2", name: "English", curriculum: "8-4-4", subjectType: "core" },
  { id: "844-s3", name: "Kiswahili", curriculum: "8-4-4", subjectType: "core" },
  { id: "844-s4", name: "Biology", curriculum: "8-4-4", subjectType: "optional" },
  { id: "844-s5", name: "Chemistry", curriculum: "8-4-4", subjectType: "optional" },
  { id: "844-s6", name: "Physics", curriculum: "8-4-4", subjectType: "optional" },
  { id: "844-s7", name: "History", curriculum: "8-4-4", subjectType: "optional" },
  { id: "844-s8", name: "Geography", curriculum: "8-4-4", subjectType: "optional" },
  { id: "844-s9", name: "Religious Education", curriculum: "8-4-4", subjectType: "optional" },
  { id: "844-s10", name: "Agriculture", curriculum: "8-4-4", subjectType: "optional" },
  { id: "844-s11", name: "Business Studies", curriculum: "8-4-4", subjectType: "optional" },
  { id: "844-s12", name: "Computer Studies", curriculum: "8-4-4", subjectType: "optional" },
];

export const getGradesByCurriculum = (curriculum: Curriculum): Grade[] => {
  switch (curriculum) {
    case "cbc":
      return cbcGrades;
    case "cbc-senior":
      return cbcSeniorGrades;
    case "8-4-4":
      return oldCurriculumGrades;
    case "custom":
      return [];
    default:
      return [];
  }
};

export const getSubjectsByCurriculum = (curriculum: Curriculum): Subject[] => {
  switch (curriculum) {
    case "cbc":
      return cbcSubjects;
    case "cbc-senior":
      return cbcSeniorSubjects;
    case "8-4-4":
      return oldCurriculumSubjects;
    case "custom":
      return [];
    default:
      return [];
  }
};

export const getCurriculumOptions = () => [
  { value: "cbc", label: "CBE Primary & Junior Secondary (Grade 1-9)", description: "For primary and junior secondary schools" },
   { value: "cbc-senior", label: "CBE Senior Secondary (Grade 10-12)", description: "For senior secondary schools (effective Jan 2026)" },
  { value: "8-4-4", label: "8-4-4 System (Form 1-4)", description: "For existing high schools (being phased out)" },
  { value: "custom", label: "Custom Curriculum", description: "Define your own grades and subjects" },
];

// Get all grades for multiple curricula (for mixed schools)
export const getGradesForCurricula = (curricula: Curriculum[]): Grade[] => {
  const allGrades: Grade[] = [];
  curricula.forEach(c => {
    allGrades.push(...getGradesByCurriculum(c));
  });
  return allGrades;
};

// Get all subjects for multiple curricula (for mixed schools)
export const getSubjectsForCurricula = (curricula: Curriculum[]): Subject[] => {
  const allSubjects: Subject[] = [];
  curricula.forEach(c => {
    allSubjects.push(...getSubjectsByCurriculum(c));
  });
  return allSubjects;
};

// Check if curriculum is CBE-based (uses "Grade" terminology)
export const isCBCBased = (curriculum: Curriculum): boolean => {
  return curriculum === "cbc" || curriculum === "cbc-senior";
};
