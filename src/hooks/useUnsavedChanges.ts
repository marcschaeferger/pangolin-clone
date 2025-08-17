
import { useEffect, useState } from 'react';
import { NavigationGuard } from "@/utils/navigationGuard";

interface UseUnsavedChangesOptions {
  hasUnsavedChanges: boolean;
  message?: string;
}

export function useUnsavedChanges({ hasUnsavedChanges, message }: UseUnsavedChangesOptions) {
  const [isNavigating, setIsNavigating] = useState(false);

  useEffect(() => {
    const navigationGuard = NavigationGuard.getInstance();
    
    // Set the singleton state based on this component's local state
    navigationGuard.setHasUnsavedChanges(hasUnsavedChanges);
    if (message) {
      navigationGuard.setWarningMessage(message);
    }

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (navigationGuard.getHasUnsavedChanges() && !isNavigating) {
        e.preventDefault();
        e.returnValue = navigationGuard.getWarningMessage();
        return navigationGuard.getWarningMessage();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Cleanup: when the component unmounts or state changes
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Don't clear the navigation guard state here - let the form handle it
    };
  }, [hasUnsavedChanges, message, isNavigating]);

  return { setIsNavigating };
}