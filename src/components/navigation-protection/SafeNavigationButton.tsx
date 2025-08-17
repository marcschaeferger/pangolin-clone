"use client";

import { Button } from "@/components/ui/button";
import { ButtonProps } from "@/components/ui/button";
import { forwardRef } from "react";
import { clearTabSpecificStorage } from "@/utils/formHelpers";

interface SafeNavigationButtonProps extends Omit<ButtonProps, 'onClick'> {
  onClick: () => void;
  hasUnsavedChanges?: boolean;
  confirmMessage?: string;
  storageKey?: string; // Add storage key for tab-specific handling
}

export const SafeNavigationButton = forwardRef<
  HTMLButtonElement,
  SafeNavigationButtonProps
>(({ onClick, hasUnsavedChanges = false, confirmMessage = "You have unsaved changes. Are you sure you want to continue?", storageKey, children, ...props }, ref) => {
  const handleClick = () => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        // Clear tab-specific storage if storageKey is provided
        if (storageKey) {
          clearTabSpecificStorage(storageKey);
        }
        
        onClick();
      }
    } else {
      onClick();
    }
  };

  return (
    <Button ref={ref} onClick={handleClick} {...props}>
      {children}
    </Button>
  );
});

SafeNavigationButton.displayName = "SafeNavigationButton";