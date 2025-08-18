import { useEffect, useRef, useState, useCallback } from "react";
import { Path, UseFormReturn } from "react-hook-form";
import { 
  generateTabId, 
  getTabStorageKey, 
  getGlobalStorageKey, 
  clearTabSpecificStorage,
  checkGlobalUnsavedChanges
} from "@/utils/formHelpers";

export function useFormPersistence<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  storageKey: string,
  excludeFields: Array<keyof T> = []
) {
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tabId = useRef<string>(generateTabId());
  const isInitialized = useRef(false);

  const updateGlobalStorage = useCallback((hasChanges: boolean, data?: any) => {
    try {
      const globalKey = getGlobalStorageKey(storageKey);
      const globalData = {
        hasUnsavedChanges: hasChanges,
        lastUpdated: Date.now(),
        tabId: tabId.current,
        data: data || null
      };
      sessionStorage.setItem(globalKey, JSON.stringify(globalData));
    } catch (error) {
      console.warn("Failed to update global storage:", error);
    }
  }, [storageKey]);

  // Initialize form data from storage
  useEffect(() => {
    if (isInitialized.current || !form?.getValues) return;
    
    const tabStorageKey = getTabStorageKey(storageKey, tabId.current);
    const savedData = sessionStorage.getItem(tabStorageKey);

    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as Partial<T>;
        Object.keys(parsedData).forEach((key) => {
          if (!excludeFields.includes(key as keyof T)) {
            const value = parsedData[key as keyof T];
            if (value !== undefined) {
              form.setValue(key as Path<T>, value);
            }
          }
        });
        
        if (Object.keys(parsedData).length > 0) {
          setHasChanges(true);
          updateGlobalStorage(true);
        }
      } catch (error) {
        console.warn("Failed to parse saved form data:", error);
      }
    }

    isInitialized.current = true;
  }, [form, storageKey, excludeFields, updateGlobalStorage]);

  // Watch for form changes
  useEffect(() => {
    if (!isInitialized.current || !form?.watch) return;
    
    const subscription = form.watch((data) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = setTimeout(() => {
        const dataToSave = { ...data };
        excludeFields.forEach((field) => {
          delete (dataToSave as any)[field];
        });
        
        const tabStorageKey = getTabStorageKey(storageKey, tabId.current);
        sessionStorage.setItem(tabStorageKey, JSON.stringify(dataToSave));

        const isDirty = form.formState.isDirty;
        setHasChanges(isDirty);
        updateGlobalStorage(isDirty, dataToSave);
      },100);
    });
    
    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form, excludeFields, storageKey, updateGlobalStorage]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  const clearPersistence = useCallback(() => {
    clearTabSpecificStorage(storageKey);
    setHasChanges(false);
    updateGlobalStorage(false);
  }, [storageKey, updateGlobalStorage]);

  return { 
    clearPersistence, 
    hasChanges, 
    tabId: tabId.current 
  };
}
