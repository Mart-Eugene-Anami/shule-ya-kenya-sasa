import { useIdleTimeout } from '@/hooks/useIdleTimeout';

interface IdleTimeoutProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component that enables idle timeout functionality for the application.
 * When a user is logged in, they will be automatically logged out after 1 hour of inactivity.
 * A warning is shown 5 minutes before the timeout.
 */
const IdleTimeoutProvider = ({ children }: IdleTimeoutProviderProps) => {
  // Initialize idle timeout tracking
  useIdleTimeout();
  
  return <>{children}</>;
};

export default IdleTimeoutProvider;
