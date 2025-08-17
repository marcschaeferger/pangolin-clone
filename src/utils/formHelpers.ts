import { UseFormReturn, FieldValues } from "react-hook-form";

// Generate a unique tab ID for this instance
export const generateTabId = () => {
  if (typeof window === 'undefined') return 'default';
  
  // Use a more reliable way to generate unique IDs
  const existingTabId = sessionStorage.getItem('pangolin_tab_id');
  if (existingTabId) {
    return existingTabId;
  }
  
  const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('pangolin_tab_id', newTabId);
  return newTabId;
};

// Storage key with tab ID for tab-specific storage
export const getTabStorageKey = (baseKey: string, tabId: string) => `${baseKey}_${tabId}`;

// Global storage key for cross-tab synchronization
export const getGlobalStorageKey = (baseKey: string) => `${baseKey}_global`;

// Clear all tab-specific storage for a given form
export const clearTabSpecificStorage = (storageKey: string) => {
  if (typeof window === 'undefined') return;
  
  const keysToRemove: string[] = [];
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && (key.startsWith(storageKey) || key.startsWith(`${storageKey}_global`))) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => sessionStorage.removeItem(key));
};

// Check if there are unsaved changes in any tab for a given form
export const checkGlobalUnsavedChanges = (storageKey: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  try {
    const globalKey = getGlobalStorageKey(storageKey);
    const globalData = sessionStorage.getItem(globalKey);
    if (globalData) {
      const parsed = JSON.parse(globalData);
      return parsed.hasUnsavedChanges || false;
    }
  } catch (error) {
    console.warn("Failed to check global unsaved changes:", error);
  }
  return false;
};

// Get all active tabs for a given form
export const getActiveTabs = (storageKey: string): string[] => {
  if (typeof window === 'undefined') return [];
  
  const activeTabs: string[] = [];
  try {
    const globalKey = getGlobalStorageKey(storageKey);
    const globalData = sessionStorage.getItem(globalKey);
    if (globalData) {
      const parsed = JSON.parse(globalData);
      if (parsed.hasUnsavedChanges && parsed.tabId) {
        activeTabs.push(parsed.tabId);
      }
    }
    
    // Also check individual tab storage
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(storageKey) && key !== globalKey) {
        const tabData = sessionStorage.getItem(key);
        if (tabData) {
          try {
            const parsed = JSON.parse(tabData);
            if (Object.keys(parsed).length > 0) {
              const tabId = key.replace(`${storageKey}_`, '');
              if (!activeTabs.includes(tabId)) {
                activeTabs.push(tabId);
              }
            }
          } catch (error) {
            // Ignore parsing errors
          }
        }
      }
    }
  } catch (error) {
    console.warn("Failed to get active tabs:", error);
  }
  
  return activeTabs;
};

// Utility to check if a form has unsaved changes (for page reload scenarios)
export const hasFormUnsavedChanges = (storageKey: string): boolean => {
  if (typeof window === 'undefined') return false;
  
  // Check global storage first
  if (checkGlobalUnsavedChanges(storageKey)) {
    return true;
  }
  
  // Check individual tab storage
  for (let i = 0; i < sessionStorage.length; i++) {
    const key = sessionStorage.key(i);
    if (key && key.startsWith(storageKey) && !key.includes('_global')) {
      const tabData = sessionStorage.getItem(key);
      if (tabData) {
        try {
          const parsed = JSON.parse(tabData);
          if (Object.keys(parsed).length > 0) {
            return true;
          }
        } catch (error) {
          // Ignore parsing errors
        }
      }
    }
  }
  
  return false;
};

export function preventEnterSubmission(e: React.KeyboardEvent) {
  if (e.key === 'Enter') {
    e.preventDefault();
    
    // find the form and submit it properly
    const form = (e.target as HTMLElement).closest('form');
    if (form) {
      // then trigger form validation and submission
      const submitEvent = new Event('submit', { 
        bubbles: true, 
        cancelable: true 
      });
      form.dispatchEvent(submitEvent);
    }
  }
}

export function handleEnterKeySubmission(
  e: React.KeyboardEvent, 
  onSubmit: () => void
) {
  if (e.key === 'Enter') {
    e.preventDefault();
    onSubmit();
  }
}

// auto-save utility
export function createAutoSave<T>(
  data: T, 
  onSave: (data: T) => void, 
  delay: number = 2000
) {
  let timeoutId: NodeJS.Timeout;
  
  return () => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      onSave(data);
    }, delay);
  };
}