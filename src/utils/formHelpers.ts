import { UseFormReturn, FieldValues } from "react-hook-form";

export const generateTabId = () => {
  if (typeof window === 'undefined') return 'default';
  
  const existingTabId = sessionStorage.getItem('pangolin_tab_id');
  if (existingTabId) {
    return existingTabId;
  }
  
  const newTabId = `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  sessionStorage.setItem('pangolin_tab_id', newTabId);
  return newTabId;
};

export const getTabStorageKey = (baseKey: string, tabId: string) => `${baseKey}_${tabId}`;
export const getGlobalStorageKey = (baseKey: string) => `${baseKey}_global`;

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