"use client";

import Link from "next/link";
import { NavigationGuard } from "@/utils/navigationGuard";
import { useRouter } from "next/navigation";
import { clearTabSpecificStorage } from "@/utils/formHelpers";

interface EnhancedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  replace?: boolean;
  storageKey?: string; // Add storage key for tab-specific handling
}

export function EnhancedLink({ href, children, className, replace = false, storageKey }: EnhancedLinkProps) {
  const router = useRouter();
  const navigationGuard = NavigationGuard.getInstance();

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    
    if (navigationGuard.getHasUnsavedChanges()) {
      const confirmed = navigationGuard.confirmNavigation();
      if (confirmed) {
        // Clear navigation guard state
        navigationGuard.clearUnsavedChanges();
        
        // Clear tab-specific storage if storageKey is provided
        if (storageKey) {
          clearTabSpecificStorage(storageKey);
        }
        
        if (replace) {
          router.replace(href);
        } else {
          router.push(href);
        }
      }
    } else {
      if (replace) {
        router.replace(href);
      } else {
        router.push(href);
      }
    }
  };

  return (
    <Link href={href} className={className} onClick={handleClick}>
      {children}
    </Link>
  );
}