import { useEffect, useRef, useState, useCallback } from "react";
import { Path, UseFormReturn } from "react-hook-form";
import { NavigationGuard } from "@/utils/navigationGuard";
import { 
  generateTabId, 
  getTabStorageKey, 
  getGlobalStorageKey, 
  clearTabSpecificStorage,
  checkGlobalUnsavedChanges as checkGlobalUnsavedChangesUtil
} from "@/utils/formHelpers";

export function useFormPersistence<T extends Record<string, any>>(
  form: UseFormReturn<T>,
  storageKey: string,
  excludeFields: Array<keyof T> = []
) {
  const initialValues = useRef<T | null>(null);
  const navigationGuard = NavigationGuard.getInstance();
  const [hasChanges, setHasChanges] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialized = useRef(false);
  const formRef = useRef<UseFormReturn<T> | null>(null);
  const tabId = useRef<string>(generateTabId());
  const storageUpdateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Check if there are unsaved changes in any tab
  const checkGlobalUnsavedChanges = useCallback(() => {
    return checkGlobalUnsavedChangesUtil(storageKey);
  }, [storageKey]);

  // Update global storage for cross-tab synchronization
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

  // Listen for storage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === getGlobalStorageKey(storageKey) && e.newValue) {
        try {
          const globalData = JSON.parse(e.newValue);
          // Only update if the change came from another tab
          if (globalData.tabId !== tabId.current) {
            // Update local state to reflect global changes
            setHasChanges(globalData.hasUnsavedChanges);
            // Update navigation guard
            navigationGuard.setHasUnsavedChanges(globalData.hasUnsavedChanges);
          }
        } catch (error) {
          console.warn("Failed to parse global storage change:", error);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey, navigationGuard]);

  // Restore saved form state
  useEffect(() => {
    // Prevent multiple initializations with the same form
    if (isInitialized.current && formRef.current === form) return;
    
    // Reset state if form changes
    if (formRef.current && formRef.current !== form) {
      isInitialized.current = false;
      initialValues.current = null;
      setHasChanges(false);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    }
    
    // Ensure form is properly initialized
    if (!form || !form.getValues) {
      console.warn("Form not properly initialized in useFormPersistence");
      return;
    }
    
    const tabStorageKey = getTabStorageKey(storageKey, tabId.current);
    const savedData = sessionStorage.getItem(tabStorageKey);

    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData) as Partial<T>;
        (Object.keys(parsedData) as Array<keyof T>).forEach((key) => {
          if (!excludeFields.includes(key)) {
            const value = parsedData[key];
            if (value !== undefined) {
              form.setValue(key as Path<T>, value);
            }
          }
        });
        // Set hasChanges if we actually restored data
        if (Object.keys(parsedData).length > 0) {
          setHasChanges(true);
          // Update global storage to reflect restored state
          updateGlobalStorage(true);
        }
      } catch (error) {
        console.warn("Failed to parse saved form data:", error);
      }
    } else {
      // Check global storage for unsaved changes from other tabs
      const globalHasChanges = checkGlobalUnsavedChanges();
      if (globalHasChanges) {
        setHasChanges(true);
        navigationGuard.setHasUnsavedChanges(true);
      }
    }

    initialValues.current = form.getValues();
    isInitialized.current = true;
    formRef.current = form;
  }, [form, storageKey, excludeFields, updateGlobalStorage, checkGlobalUnsavedChanges, navigationGuard]);

  // Watch form changes and persist
  useEffect(() => {
    if (!isInitialized.current) return; // Wait for initialization
    
    // Ensure form is properly initialized
    if (!form || !form.watch || !form.formState) {
      console.warn("Form not properly initialized in useFormPersistence watch");
      return;
    }
    
    // Additional check to ensure form is ready
    if (!form.getValues || typeof form.getValues() === 'undefined') {
      console.warn("Form values not ready in useFormPersistence watch");
      return;
    }
    
    // Prevent multiple watchers for the same form
    if (formRef.current !== form) return;
    
    const subscription = form.watch((data) => {
      if (initialValues.current) {
        // Clear any existing timeout
        if (saveTimeoutRef.current) {
          clearTimeout(saveTimeoutRef.current);
        }

        // Debounce the save operation to prevent excessive updates
        saveTimeoutRef.current = setTimeout(() => {
          const dataToSave = { ...data };
          excludeFields.forEach((field) => {
            delete (dataToSave as any)[field];
          });
          
          // Save to tab-specific storage
          const tabStorageKey = getTabStorageKey(storageKey, tabId.current);
          sessionStorage.setItem(tabStorageKey, JSON.stringify(dataToSave));

          // Only update hasChanges if the form is actually dirty
          const dirty = form.formState.isDirty;
          setHasChanges(dirty);
          
          // Update global storage for cross-tab sync
          updateGlobalStorage(dirty, dataToSave);
        }, 300); // Increased debounce to 300ms for better stability
      }
    });
    
    return () => {
      subscription.unsubscribe();
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [form, excludeFields, storageKey, updateGlobalStorage]);

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (storageUpdateTimeoutRef.current) {
        clearTimeout(storageUpdateTimeoutRef.current);
      }
    };
  }, []);

  // Clear saved form state when saved
  const clearPersistence = () => {
    clearTabSpecificStorage(storageKey);
    setHasChanges(false);
    updateGlobalStorage(false);
    navigationGuard.clearUnsavedChanges();
  };

  // Force check for unsaved changes (useful for page reload scenarios)
  const checkForUnsavedChanges = useCallback(() => {
    const tabStorageKey = getTabStorageKey(storageKey, tabId.current);
    const savedData = sessionStorage.getItem(tabStorageKey);
    const globalHasChanges = checkGlobalUnsavedChanges();
    
    if (savedData || globalHasChanges) {
      setHasChanges(true);
      navigationGuard.setHasUnsavedChanges(true);
      return true;
    }
    return false;
  }, [storageKey, checkGlobalUnsavedChanges, navigationGuard]);

  return { 
    clearPersistence, 
    hasChanges: () => hasChanges,
    checkForUnsavedChanges,
    tabId: tabId.current
  };
}
