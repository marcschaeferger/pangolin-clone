import { UseFormReturn, FieldValues } from 'react-hook-form';
import { useEffect } from 'react';
import { useFormPersistence } from './useFormPersistence';
import { useUnsavedChanges } from './useUnsavedChanges'; // The new hook

interface UseFormWithUnsavedChangesOptions<T extends FieldValues> {
  form: UseFormReturn<T>;
  storageKey: string;
  excludeFields?: (keyof T)[];
  warningMessage?: string;
}

export function useFormWithUnsavedChanges<T extends FieldValues>({
  form,
  storageKey,
  excludeFields = [],
  warningMessage
}: UseFormWithUnsavedChangesOptions<T>) {
  // Call useFormPersistence directly at the top level
  const { clearPersistence, hasChanges, checkForUnsavedChanges, tabId } = useFormPersistence(
    form,
    storageKey,
    excludeFields
  );

  // Get the current state once to avoid multiple function calls
  const currentHasChanges = hasChanges();

  // This hook now manages the `beforeunload` event and the singleton state
  const { setIsNavigating } = useUnsavedChanges({
    hasUnsavedChanges: currentHasChanges,
    message: warningMessage
  });

  // Check for unsaved changes on mount (useful for page reload scenarios)
  useEffect(() => {
    // Small delay to ensure form is fully initialized
    const timer = setTimeout(() => {
      checkForUnsavedChanges();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [checkForUnsavedChanges]);

  const handleFormSubmit = (onSubmit: (data: T) => Promise<void> | void) => {
    return form.handleSubmit(async (data: T) => {
      try {
        setIsNavigating(true);
        await onSubmit(data);
        clearPersistence();
      } catch (error) {
        setIsNavigating(false);
        throw error;
      }
    });
  };

  return {
    hasUnsavedChanges: currentHasChanges,
    clearPersistence,
    handleFormSubmit,
    checkForUnsavedChanges,
    tabId
  };
}