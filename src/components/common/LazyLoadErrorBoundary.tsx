import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary that catches lazy-load chunk failures and
 * other render errors, offering a retry without full page reload.
 */
class LazyLoadErrorBoundary extends Component<Props, State> {
  public state: State = { hasError: false, error: null };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("LazyLoadErrorBoundary caught:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      const isChunkError =
        this.state.error?.message?.includes("Failed to fetch dynamically imported module") ||
        this.state.error?.message?.includes("Loading chunk") ||
        this.state.error?.message?.includes("Loading CSS chunk") ||
        this.state.error?.message?.includes("dynamically imported module");

      return (
        <div className="flex h-screen items-center justify-center bg-background">
          <div className="text-center max-w-md px-4">
            <AlertTriangle className="h-10 w-10 mx-auto mb-4 text-destructive" />
            <h2 className="text-lg font-semibold mb-2">
              {isChunkError ? "Page failed to load" : "Something went wrong"}
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              {isChunkError
                ? "This usually happens due to a network issue or an app update. Try again below."
                : "An unexpected error occurred. Try again or reload the page."}
            </p>
            <div className="flex gap-3 justify-center">
              <Button onClick={this.handleRetry} variant="default">
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              <Button onClick={this.handleReload} variant="outline">
                Reload Page
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default LazyLoadErrorBoundary;
