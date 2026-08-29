import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { generateMasterTimetable, MasterTimetableOptions, MasterGenerationResult } from "@/services/timetable/masterTimetableGenerator";
import { useQueryClient } from "@tanstack/react-query";

interface TimetableGenerationState {
  isGenerating: boolean;
  result: MasterGenerationResult | null;
  startedAt: Date | null;
  options: MasterTimetableOptions | null;
}

interface TimetableGenerationContextType {
  state: TimetableGenerationState;
  startGeneration: (options: MasterTimetableOptions) => void;
  dismissResult: () => void;
}

const TimetableGenerationContext = createContext<TimetableGenerationContextType | null>(null);

export const useTimetableGeneration = () => {
  const ctx = useContext(TimetableGenerationContext);
  if (!ctx) throw new Error("useTimetableGeneration must be used within TimetableGenerationProvider");
  return ctx;
};

export const TimetableGenerationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();
  const [state, setState] = useState<TimetableGenerationState>({
    isGenerating: false,
    result: null,
    startedAt: null,
    options: null,
  });
  const abortRef = useRef(false);

  const startGeneration = useCallback(async (options: MasterTimetableOptions) => {
    if (state.isGenerating) return;

    abortRef.current = false;
    setState({
      isGenerating: true,
      result: null,
      startedAt: new Date(),
      options,
    });

    try {
      const result = await generateMasterTimetable(options);
      if (!abortRef.current) {
        queryClient.invalidateQueries({ queryKey: ["timetables"] });
        setState(prev => ({
          ...prev,
          isGenerating: false,
          result,
        }));
      }
    } catch (error: any) {
      if (!abortRef.current) {
        setState(prev => ({
          ...prev,
          isGenerating: false,
          result: {
            success: false,
            message: error.message || "Generation failed unexpectedly",
            streamResults: [],
            conflicts: [],
            warnings: [],
            stats: {
              totalStreams: 0,
              successfulStreams: 0,
              failedStreams: 0,
              totalSlots: 0,
              filledSlots: 0,
              freeSlots: 0,
              teacherUtilization: 0,
            },
          } as MasterGenerationResult,
        }));
      }
    }
  }, [state.isGenerating, queryClient]);

  const dismissResult = useCallback(() => {
    setState(prev => ({ ...prev, result: null }));
  }, []);

  return (
    <TimetableGenerationContext.Provider value={{ state, startGeneration, dismissResult }}>
      {children}
    </TimetableGenerationContext.Provider>
  );
};
