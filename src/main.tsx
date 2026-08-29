import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";
import { BrowserRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "./contexts/AuthContext";
import { GlobalStateProvider } from "./contexts/GlobalStateContext";
import IdleTimeoutProvider from "./components/auth/IdleTimeoutProvider";
import { BulkUploadProvider } from "./contexts/BulkUploadContext";
import { TimetableGenerationProvider } from "./contexts/TimetableGenerationContext";

// Configure the query client with optimizations for large datasets
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 60000, // 60 seconds (up from 30s — reduces refetches)
      gcTime: 300000, // 5 minutes
      refetchOnWindowFocus: false, // Changed from 'always' — prevents waterfall refetches on tab switch
      refetchOnReconnect: true,
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <BrowserRouter>
          <GlobalStateProvider>
            <AuthProvider>
              <IdleTimeoutProvider>
                <BulkUploadProvider>
                  <TimetableGenerationProvider>
                    <App />
                  </TimetableGenerationProvider>
                </BulkUploadProvider>
              </IdleTimeoutProvider>
            </AuthProvider>
          </GlobalStateProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
);
