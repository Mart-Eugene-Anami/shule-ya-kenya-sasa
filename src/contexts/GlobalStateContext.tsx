
import React, { createContext, useContext, useReducer, useMemo, useCallback } from 'react';

// Define the structure of our global state
interface GlobalState {
  currentSchool: any | null;
  currentAcademicYear: any | null;
  currentTerm: any | null;
  userPreferences: {
    theme: 'light' | 'dark' | 'system';
    tablePageSize: number;
    [key: string]: any;
  };
  cachedData: {
    [key: string]: {
      data: any;
      timestamp: number;
    };
  };
}

// Initial state
const initialState: GlobalState = {
  currentSchool: null,
  currentAcademicYear: null,
  currentTerm: null,
  userPreferences: {
    theme: 'system',
    tablePageSize: 10
  },
  cachedData: {}
};

// Define action types
type Action = 
  | { type: 'SET_SCHOOL', payload: any }
  | { type: 'SET_ACADEMIC_YEAR', payload: any }
  | { type: 'SET_TERM', payload: any }
  | { type: 'UPDATE_USER_PREFERENCE', payload: { key: string, value: any } }
  | { type: 'CACHE_DATA', payload: { key: string, data: any } }
  | { type: 'CLEAR_CACHE', payload?: { key?: string } };

// Create the reducer
const reducer = (state: GlobalState, action: Action): GlobalState => {
  switch (action.type) {
    case 'SET_SCHOOL':
      return {
        ...state,
        currentSchool: action.payload
      };
    case 'SET_ACADEMIC_YEAR':
      return {
        ...state,
        currentAcademicYear: action.payload
      };
    case 'SET_TERM':
      return {
        ...state,
        currentTerm: action.payload
      };
    case 'UPDATE_USER_PREFERENCE':
      return {
        ...state,
        userPreferences: {
          ...state.userPreferences,
          [action.payload.key]: action.payload.value
        }
      };
    case 'CACHE_DATA':
      return {
        ...state,
        cachedData: {
          ...state.cachedData,
          [action.payload.key]: {
            data: action.payload.data,
            timestamp: Date.now()
          }
        }
      };
    case 'CLEAR_CACHE':
      if (action.payload?.key) {
        const newCache = { ...state.cachedData };
        delete newCache[action.payload.key];
        return {
          ...state,
          cachedData: newCache
        };
      }
      return {
        ...state,
        cachedData: {}
      };
    default:
      return state;
  }
};

// Create the context
const GlobalStateContext = createContext<{
  state: GlobalState;
  dispatch: React.Dispatch<Action>;
  getCachedData: (key: string, maxAge?: number) => any;
  cacheData: (key: string, data: any) => void;
  setSchool: (school: any) => void;
  setAcademicYear: (year: any) => void;
  setTerm: (term: any) => void;
} | undefined>(undefined);

// Provider component
export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Helper functions
  const getCachedData = useCallback((key: string, maxAge?: number): any => {
    const cached = state.cachedData[key];
    if (!cached) return null;
    
    if (maxAge && (Date.now() - cached.timestamp > maxAge)) {
      // Data is too old
      return null;
    }
    
    return cached.data;
  }, [state.cachedData]);

  const cacheData = useCallback((key: string, data: any): void => {
    dispatch({ type: 'CACHE_DATA', payload: { key, data } });
  }, []);

  const setSchool = useCallback((school: any): void => {
    dispatch({ type: 'SET_SCHOOL', payload: school });
  }, []);

  const setAcademicYear = useCallback((year: any): void => {
    dispatch({ type: 'SET_ACADEMIC_YEAR', payload: year });
  }, []);

  const setTerm = useCallback((term: any): void => {
    dispatch({ type: 'SET_TERM', payload: term });
  }, []);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    state,
    dispatch,
    getCachedData,
    cacheData,
    setSchool,
    setAcademicYear,
    setTerm
  }), [state, getCachedData, cacheData, setSchool, setAcademicYear, setTerm]);

  return (
    <GlobalStateContext.Provider value={value}>
      {children}
    </GlobalStateContext.Provider>
  );
};

// Custom hook to use the global state
export const useGlobalState = () => {
  const context = useContext(GlobalStateContext);
  if (context === undefined) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
};
