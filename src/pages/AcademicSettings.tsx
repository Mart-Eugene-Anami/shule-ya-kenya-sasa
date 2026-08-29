
import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "../components/layout/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AcademicYear, SchoolTerm, TermStatusResult } from "../types";
import { useToast } from "@/hooks/use-toast";
import {
  CalendarClock,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Plus,
  Calendar,
  Loader2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { format, isWithinInterval, isAfter, isBefore, parseISO } from "date-fns";
import YearEndResetWizard from "@/components/academic/YearEndResetWizard";
import ArchivedYearsViewer from "@/components/academic/ArchivedYearsViewer";
import { useAuth } from "@/contexts/AuthContext";
import {
  getAcademicYears,
  getTerms,
  createAcademicYear,
  createTerm,
  setActiveTerm,
  setActiveAcademicYear,
} from "@/services/academicService";

interface TermAnalysis {
  currentTermByDate: SchoolTerm | null;
  activeTerm: SchoolTerm | null;
  needsTermTransition: boolean;
  isTermEnded: boolean;
  nextTerm: SchoolTerm | null;
  lastTermOfYear: SchoolTerm | null;
  needsNextTermCreation: boolean;
  needsNewYearSetup: boolean;
}

const AcademicSettings = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [showYearEndWizard, setShowYearEndWizard] = useState(false);
  const [academicYears, setAcademicYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<SchoolTerm[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [isYearResetDialogOpen, setIsYearResetDialogOpen] = useState(false);
  const [isNewTermDialogOpen, setIsNewTermDialogOpen] = useState(false);
  const [isNewAcademicYearDialogOpen, setIsNewAcademicYearDialogOpen] = useState(false);
  const [newYear, setNewYear] = useState({ year: "" });
  const [newTerm, setNewTerm] = useState<Partial<SchoolTerm>>({
    name: "",
    startDate: "",
    endDate: "",
    academicYearId: "",
  });

  // Analyze current term status based on dates
  const termAnalysis = useMemo((): TermAnalysis => {
    const today = new Date();
    const activeAcademicYear = academicYears.find(y => y.isActive);
    
    // Get terms for active academic year only
    const activeYearTerms = activeAcademicYear 
      ? terms.filter(t => t.academicYearId === activeAcademicYear.id)
      : [];
    
    // Find term that should be current based on dates
    const currentTermByDate = activeYearTerms.find(term => {
      const startDate = parseISO(term.startDate);
      const endDate = parseISO(term.endDate);
      return isWithinInterval(today, { start: startDate, end: endDate });
    }) || null;
    
    // Find the manually set active term
    const activeTerm = terms.find(t => t.isActive) || null;
    
    // Check if there's a mismatch (needs transition)
    const needsTermTransition = currentTermByDate !== null && 
      activeTerm !== null && 
      currentTermByDate.id !== activeTerm.id;
    
    // Check if current term has ended
    const isTermEnded = activeTerm !== null && 
      isAfter(today, parseISO(activeTerm.endDate));
    
    // Find next upcoming term
    const nextTerm = activeYearTerms
      .filter(t => isAfter(parseISO(t.startDate), today))
      .sort((a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime())[0] || null;
    
    // Find last term of the active year
    const lastTermOfYear = activeYearTerms
      .sort((a, b) => parseISO(b.endDate).getTime() - parseISO(a.endDate).getTime())[0] || null;
    
    // Check if we need to prompt for next term creation
    const needsNextTermCreation = isTermEnded && !nextTerm && lastTermOfYear !== null;
    
    // Check if academic year has ended (last term has ended)
    const needsNewYearSetup = lastTermOfYear !== null && 
      isAfter(today, parseISO(lastTermOfYear.endDate)) && 
      !nextTerm;
    
    return {
      currentTermByDate,
      activeTerm,
      needsTermTransition,
      isTermEnded,
      nextTerm,
      lastTermOfYear,
      needsNextTermCreation,
      needsNewYearSetup,
    };
  }, [terms, academicYears]);

  const [termStatus, setTermStatus] = useState<TermStatusResult>({
    currentTerm: null,
    currentAcademicYear: null,
    nextTerms: [],
    previousTerms: [],
  });

  // Fetch data from Supabase
  const fetchData = useCallback(async () => {
    if (!user?.schoolId) {
      setIsLoading(false);
      return;
    }

    try {
      
      
      const [yearsData, termsData] = await Promise.all([
        getAcademicYears(user.schoolId),
        getTerms(user.schoolId),
      ]);
      
      
      setAcademicYears(yearsData);
      setTerms(termsData);
    } catch (error) {
      console.error("Error fetching academic data:", error);
      toast({
        title: "Error",
        description: "Failed to load academic data",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [user?.schoolId, toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update term status whenever terms or academic years change
  useEffect(() => {
    // Use the date-based current term if available, otherwise fall back to active term
    const currentTerm = termAnalysis.currentTermByDate || termAnalysis.activeTerm;
    const currentAcademicYear = academicYears.find(y => y.isActive) || null;
    
    const today = new Date();
    const nextTerms = terms.filter(t => 
      !t.isActive && isAfter(parseISO(t.startDate), today)
    );
    
    const previousTerms = terms.filter(t => 
      !t.isActive && isBefore(parseISO(t.endDate), today)
    );
    
    setTermStatus({
      currentTerm,
      currentAcademicYear,
      nextTerms,
      previousTerms,
    });
  }, [terms, academicYears, termAnalysis]);

  // Auto-transition term if needed
  const handleAutoTransition = async () => {
    if (!termAnalysis.currentTermByDate || !user?.schoolId) return;
    
    setIsSubmitting(true);
    try {
      await setActiveTerm(termAnalysis.currentTermByDate.id, user.schoolId);
      
      // Refresh terms
      const updatedTerms = await getTerms(user.schoolId);
      setTerms(updatedTerms);
      
      toast({
        title: "Term Updated",
        description: `Transitioned to ${termAnalysis.currentTermByDate.name} based on current date.`,
      });
    } catch (error: any) {
      console.error("Error transitioning term:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to transition term",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenYearEndWizard = () => {
    setShowYearEndWizard(true);
    setIsYearResetDialogOpen(false);
  };

  const handleYearEndComplete = () => {
    setShowYearEndWizard(false);
    toast({
      title: "Year-End Reset Complete",
      description: "Students have been promoted and stream teachers have been reset.",
    });
  };

  const handleCreateAcademicYear = async () => {
    if (!newYear.year || !user?.schoolId) {
      toast({
        title: "Error",
        description: "Please enter a valid academic year",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create new academic year (it will be active by default)
      const createdYear = await createAcademicYear({
        year: newYear.year,
        isActive: true,
        schoolId: user.schoolId,
      });
      
      // Set new year as active (deactivates others)
      await setActiveAcademicYear(createdYear.id, user.schoolId);
      
      // Refresh academic years
      const updatedYears = await getAcademicYears(user.schoolId);
      setAcademicYears(updatedYears);
      
      toast({
        title: "Academic Year Created",
        description: `${newYear.year} has been set as the current academic year.`,
      });
      
      setNewYear({ year: "" });
      setIsNewAcademicYearDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating academic year:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create academic year",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateTerm = async () => {
    if (!newTerm.name || !newTerm.startDate || !newTerm.endDate || !newTerm.academicYearId || !user?.schoolId) {
      toast({
        title: "Error",
        description: "Please fill in all term details",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await createTerm({
        name: newTerm.name,
        startDate: new Date(newTerm.startDate).toISOString(),
        endDate: new Date(newTerm.endDate).toISOString(),
        academicYearId: newTerm.academicYearId,
        isActive: false,
        schoolId: user.schoolId,
      });
      
      // Refresh terms
      const updatedTerms = await getTerms(user.schoolId);
      setTerms(updatedTerms);
      
      toast({
        title: "Term Created",
        description: `${newTerm.name} has been added to the academic calendar.`,
      });
      
      setNewTerm({
        name: "",
        startDate: "",
        endDate: "",
        academicYearId: "",
      });
      setIsNewTermDialogOpen(false);
    } catch (error: any) {
      console.error("Error creating term:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create term",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activateTerm = async (termId: string) => {
    if (!user?.schoolId) return;
    
    setIsSubmitting(true);
    try {
      await setActiveTerm(termId, user.schoolId);
      
      // Refresh terms
      const updatedTerms = await getTerms(user.schoolId);
      setTerms(updatedTerms);
      
      const activatedTerm = updatedTerms.find(t => t.id === termId);
      
      toast({
        title: "Term Activated",
        description: `${activatedTerm?.name} is now the active term.`,
      });
    } catch (error: any) {
      console.error("Error activating term:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate term",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const activateAcademicYear = async (yearId: string) => {
    if (!user?.schoolId) return;
    
    setIsSubmitting(true);
    try {
      await setActiveAcademicYear(yearId, user.schoolId);
      
      // Refresh academic years
      const updatedYears = await getAcademicYears(user.schoolId);
      setAcademicYears(updatedYears);
      
      const activatedYear = updatedYears.find(y => y.id === yearId);
      
      toast({
        title: "Academic Year Activated",
        description: `${activatedYear?.year} is now the active academic year.`,
      });
    } catch (error: any) {
      console.error("Error activating academic year:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to activate academic year",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "PPP");
    } catch {
      return dateString;
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Academic Settings">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Academic Settings">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-foreground">Academic Year & Term Management</h2>
        <p className="text-muted-foreground">
          Manage academic years, terms, and perform year-end processes
        </p>
      </div>

      {/* Alerts Section */}
      <div className="space-y-4 mb-6">
        {/* Term Transition Alert */}
        {termAnalysis.needsTermTransition && termAnalysis.currentTermByDate && (
          <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">Term Transition Available</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              <div className="flex flex-col gap-3">
                <p>
                  Based on today's date, the current term should be <strong>{termAnalysis.currentTermByDate.name}</strong>.
                  {termAnalysis.activeTerm && (
                    <> The system still shows <strong>{termAnalysis.activeTerm.name}</strong> as active.</>
                  )}
                </p>
                <Button 
                  size="sm" 
                  className="w-fit"
                  onClick={handleAutoTransition}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-4 w-4" />}
                  Switch to {termAnalysis.currentTermByDate.name}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Term Ended - Create Next Term Alert */}
        {termAnalysis.isTermEnded && termAnalysis.needsNextTermCreation && !termAnalysis.needsNewYearSetup && (
          <Alert variant="default" className="border-blue-500 bg-blue-50 dark:bg-blue-950/20">
            <Calendar className="h-4 w-4 text-blue-600" />
            <AlertTitle className="text-blue-800 dark:text-blue-200">Current Term Has Ended</AlertTitle>
            <AlertDescription className="text-blue-700 dark:text-blue-300">
              <div className="flex flex-col gap-3">
                <p>
                  <strong>{termAnalysis.activeTerm?.name}</strong> has ended and there's no next term defined.
                  Please create the next term to continue tracking the academic calendar.
                </p>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="w-fit border-blue-500 text-blue-700 hover:bg-blue-100 dark:text-blue-300 dark:hover:bg-blue-900/30"
                  onClick={() => {
                    const activeYear = academicYears.find(y => y.isActive);
                    if (activeYear) {
                      setNewTerm({ ...newTerm, academicYearId: activeYear.id });
                    }
                    setIsNewTermDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Create Next Term
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Year End - New Academic Year Alert */}
        {termAnalysis.needsNewYearSetup && (
          <Alert variant="destructive" className="border-red-500 bg-red-50 dark:bg-red-950/20">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Academic Year Completed</AlertTitle>
            <AlertDescription>
              <div className="flex flex-col gap-3">
                <p>
                  All terms for the current academic year have ended. 
                  It's time to set up a new academic year and perform the year-end reset to promote students.
                </p>
                <div className="flex gap-2 flex-wrap">
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="w-fit"
                    onClick={() => setIsNewAcademicYearDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Academic Year
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive"
                    className="w-fit"
                    onClick={() => setIsYearResetDialogOpen(true)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Start Year-End Reset
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* No Active Term Warning */}
        {!termAnalysis.activeTerm && !termAnalysis.currentTermByDate && terms.length > 0 && (
          <Alert variant="default" className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-amber-800 dark:text-amber-200">No Active Term</AlertTitle>
            <AlertDescription className="text-amber-700 dark:text-amber-300">
              No term is currently active. Please activate a term from the list below.
            </AlertDescription>
          </Alert>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Current Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarClock className="mr-2 h-5 w-5 text-primary" />
              Current Academic Status
            </CardTitle>
            <CardDescription>Active year and term information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Academic Year</h3>
                <p className="mt-1 text-xl font-bold text-foreground">
                  {termStatus.currentAcademicYear?.year || "No active academic year"}
                </p>
              </div>
              
              <div className={`rounded-lg p-4 ${
                termAnalysis.needsTermTransition 
                  ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-300 dark:border-amber-700' 
                  : 'bg-muted'
              }`}>
                <h3 className="text-sm font-medium text-muted-foreground">Current Term</h3>
                {termStatus.currentTerm ? (
                  <div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xl font-bold text-foreground">{termStatus.currentTerm.name}</p>
                      {termAnalysis.currentTermByDate && termAnalysis.activeTerm && 
                       termAnalysis.currentTermByDate.id !== termAnalysis.activeTerm.id && (
                        <span className="text-xs bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded">
                          Based on date
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(termStatus.currentTerm.startDate)} - {formatDate(termStatus.currentTerm.endDate)}
                    </p>
                    {termAnalysis.isTermEnded && (
                      <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                        This term has ended
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="mt-1 text-amber-600">No active term. Please activate a term.</p>
                )}
              </div>
              
              {termStatus.nextTerms.length > 0 && (
                <div className="rounded-lg bg-muted p-4">
                  <h3 className="text-sm font-medium text-muted-foreground">Next Term</h3>
                  <p className="mt-1 font-medium text-foreground">{termStatus.nextTerms[0]?.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Starts {formatDate(termStatus.nextTerms[0]?.startDate)}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="justify-between border-t px-6 py-4">
            <Button
              variant="outline"
              onClick={() => setIsNewAcademicYearDialogOpen(true)}
            >
              New Academic Year
            </Button>
            <Button 
              className="bg-primary hover:bg-primary/90"
              onClick={() => setIsNewTermDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Term
            </Button>
          </CardFooter>
        </Card>

        {/* Year-End Reset Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <RefreshCw className="mr-2 h-5 w-5 text-primary" />
              Year-End Process
            </CardTitle>
            <CardDescription>Promote students and reset for a new academic year</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/20 p-4">
                <h3 className="text-sm font-medium text-amber-800 dark:text-amber-200">Important Information</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700 dark:text-amber-300">
                  <li>Students will be promoted to the next grade in the same stream</li>
                  <li>You can review and change stream assignments before confirming</li>
                  <li>Grade 9 (CBC) and Form 4 (8-4-4) students will be graduated</li>
                  <li>Stream teacher assignments will be cleared</li>
                </ul>
              </div>
              
              <div className="rounded-lg bg-muted p-4">
                <h3 className="text-sm font-medium text-muted-foreground">Process Steps</h3>
                <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                  <li>Review all students and their new grade/stream assignments</li>
                  <li>Make any necessary stream changes</li>
                  <li>Confirm and execute the promotion</li>
                  <li>Reassign stream teachers after completion</li>
                </ol>
              </div>
            </div>
          </CardContent>
          <CardFooter className="justify-end border-t px-6 py-4">
            <Button 
              variant="destructive"
              onClick={() => setIsYearResetDialogOpen(true)}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Perform Year-End Reset
            </Button>
          </CardFooter>
        </Card>
      </div>

      {/* Archived Years Section */}
      <div className="mt-8">
        <ArchivedYearsViewer />
      </div>

      {/* Term Management Section */}
      <div className="mt-8">
        <h3 className="mb-4 text-xl font-semibold text-foreground">Term Management</h3>
        
        <Card>
          <CardHeader>
            <CardTitle>Academic Calendar</CardTitle>
            <CardDescription>View and manage terms for each academic year</CardDescription>
          </CardHeader>
          <CardContent>
            {academicYears.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <p className="text-muted-foreground">No academic years found. Create one to get started.</p>
                <Button 
                  variant="link" 
                  className="mt-2 text-primary"
                  onClick={() => setIsNewAcademicYearDialogOpen(true)}
                >
                  Create Academic Year
                </Button>
              </div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {academicYears.map((year) => (
                  <AccordionItem key={year.id} value={year.id}>
                    <AccordionTrigger className="px-4">
                      <div className="flex items-center text-left">
                        <span className="mr-2">{year.year}</span>
                        {year.isActive ? (
                          <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-xs text-green-800 dark:text-green-200">
                            Current
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="ml-2 h-6 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              activateAcademicYear(year.id);
                            }}
                            disabled={isSubmitting}
                          >
                            Set as Current
                          </Button>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4">
                      <div className="space-y-4 pt-2">
                        {terms
                          .filter(term => term.academicYearId === year.id)
                          .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                          .map((term) => {
                            const isCurrentByDate = termAnalysis.currentTermByDate?.id === term.id;
                            const isEnded = isAfter(new Date(), parseISO(term.endDate));
                            const isUpcoming = isBefore(new Date(), parseISO(term.startDate));
                            
                            return (
                              <div 
                                key={term.id}
                                className={`rounded-lg border p-4 ${
                                  term.isActive 
                                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20' 
                                    : isCurrentByDate
                                      ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                                      : 'border-border'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-medium text-foreground">{term.name}</h4>
                                      {isEnded && !term.isActive && (
                                        <span className="text-xs bg-muted px-2 py-0.5 rounded text-muted-foreground">
                                          Ended
                                        </span>
                                      )}
                                      {isUpcoming && (
                                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 px-2 py-0.5 rounded text-blue-700 dark:text-blue-300">
                                          Upcoming
                                        </span>
                                      )}
                                      {isCurrentByDate && !term.isActive && (
                                        <span className="text-xs bg-amber-200 dark:bg-amber-800 px-2 py-0.5 rounded text-amber-800 dark:text-amber-200">
                                          Current by date
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-sm text-muted-foreground">
                                      {formatDate(term.startDate)} - {formatDate(term.endDate)}
                                    </p>
                                  </div>
                                  
                                  {!term.isActive ? (
                                    <Button 
                                      size="sm" 
                                      variant={isCurrentByDate ? "default" : "outline"}
                                      onClick={() => activateTerm(term.id)}
                                      disabled={isSubmitting}
                                    >
                                      {isSubmitting ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : isCurrentByDate ? (
                                        <>
                                          <ArrowRight className="mr-1 h-4 w-4" />
                                          Set as Current
                                        </>
                                      ) : (
                                        "Activate"
                                      )}
                                    </Button>
                                  ) : (
                                    <span className="flex items-center text-sm font-medium text-green-600 dark:text-green-400">
                                      <CheckCircle className="mr-1 h-4 w-4" />
                                      Active
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                          
                        {terms.filter(term => term.academicYearId === year.id).length === 0 && (
                          <div className="rounded-lg border border-dashed border-border p-4 text-center text-muted-foreground">
                            <p>No terms defined for this academic year.</p>
                            <Button 
                              variant="link" 
                              className="mt-2 text-primary"
                              onClick={() => {
                                setNewTerm({...newTerm, academicYearId: year.id});
                                setIsNewTermDialogOpen(true);
                              }}
                            >
                              Add a term
                            </Button>
                          </div>
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Year-End Reset Wizard */}
      {showYearEndWizard && (
        <Dialog open={showYearEndWizard} onOpenChange={setShowYearEndWizard}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Year-End Reset</DialogTitle>
              <DialogDescription>
                Review and confirm student promotions for the new academic year
              </DialogDescription>
            </DialogHeader>
            <YearEndResetWizard
              onComplete={handleYearEndComplete}
              onCancel={() => setShowYearEndWizard(false)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Year-End Reset Confirmation Dialog */}
      <Dialog open={isYearResetDialogOpen} onOpenChange={setIsYearResetDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Year-End Reset</DialogTitle>
            <DialogDescription>
              This action will promote all students to the next grade level and reset stream assignments.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="space-y-4">
              <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 text-amber-800 dark:text-amber-200">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium">What will happen</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                      <li>Students will be promoted to the next grade (same stream by default)</li>
                      <li>You can change streams before confirming</li>
                      <li>Grade 9 / Form 4 students will be graduated</li>
                      <li>Stream teacher assignments will be reset</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button variant="ghost" onClick={() => setIsYearResetDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleOpenYearEndWizard}
            >
              Review Students & Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Academic Year Dialog */}
      <Dialog open={isNewAcademicYearDialogOpen} onOpenChange={setIsNewAcademicYearDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Academic Year</DialogTitle>
            <DialogDescription>
              Define a new academic year. This will become the active year.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="year">Academic Year</Label>
              <Input
                id="year"
                placeholder="e.g., 2024-2025"
                value={newYear.year}
                onChange={(e) => setNewYear({ ...newYear, year: e.target.value })}
              />
            </div>
            
            <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 p-3 text-sm text-amber-800 dark:text-amber-200">
              <p>Creating a new academic year will deactivate the current academic year.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewAcademicYearDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleCreateAcademicYear}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Create Academic Year
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Term Dialog */}
      <Dialog open={isNewTermDialogOpen} onOpenChange={setIsNewTermDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Term</DialogTitle>
            <DialogDescription>
              Define a new term for the academic calendar.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="termName">Term Name</Label>
              <Input
                id="termName"
                placeholder="e.g., Term 1"
                value={newTerm.name}
                onChange={(e) => setNewTerm({ ...newTerm, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="academicYear">Academic Year</Label>
              <select
                id="academicYear"
                className="w-full rounded-md border border-input bg-background p-2 text-foreground"
                value={newTerm.academicYearId}
                onChange={(e) => setNewTerm({ ...newTerm, academicYearId: e.target.value })}
              >
                <option value="">Select Academic Year</option>
                {academicYears.map((year) => (
                  <option key={year.id} value={year.id}>
                    {year.year} {year.isActive ? "(Current)" : ""}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="startDate"
                    type="date"
                    className="pl-10"
                    value={newTerm.startDate}
                    onChange={(e) => setNewTerm({ ...newTerm, startDate: e.target.value })}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endDate">End Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="endDate"
                    type="date"
                    className="pl-10"
                    value={newTerm.endDate}
                    onChange={(e) => setNewTerm({ ...newTerm, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsNewTermDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              onClick={handleCreateTerm}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Add Term
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default AcademicSettings;
