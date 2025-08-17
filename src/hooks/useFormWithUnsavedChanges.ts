import { UseFormReturn, FieldValues } from 'react-hook-form';
import { useEffect } from 'react';
import { useFormPersistence } from './useFormPersistence';
import { useUnsavedChanges } from './useUnsavedChanges';

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
  const { clearPersistence, hasChanges, tabId } = useFormPersistence(
    form,
    storageKey,
    excludeFields
  );

  const { setIsNavigating } = useUnsavedChanges({
    hasUnsavedChanges: hasChanges,
    message: warningMessage
  });

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
    hasUnsavedChanges: hasChanges, 
    clearPersistence, 
    handleFormSubmit, 
    tabId 
  };
}