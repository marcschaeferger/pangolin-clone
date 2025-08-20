"use client";

import React from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { NavigationGuard } from '@/utils/navigationGuard';

interface ProtectedLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  tabIndex?: number;
  'aria-disabled'?: boolean;
}

export function ProtectedLink({ 
  href, 
  children, 
  className, 
  onClick,
  tabIndex,
  'aria-disabled': ariaDisabled,
  ...props 
}: ProtectedLinkProps) {
  const router = useRouter();
  const pathname = usePathname();
  const navigationGuard = NavigationGuard.getInstance();
  
  // Don't protect if it's a disabled link (href="#")
  const isDisabledLink = href === "#";
  const isCurrentPage = pathname.startsWith(href) && href !== "#";

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Call the original onClick if it exists (for disabled handling, etc.)
    if (onClick) {
      onClick(e);
    }

    // Don't intercept if:
    // - It's a disabled link
    // - It's the current page
    // - The original onClick prevented default
    if (isDisabledLink || isCurrentPage || e.defaultPrevented) {
      return;
    }

    // Check for unsaved changes
    if (navigationGuard.getHasUnsavedChanges()) {
      e.preventDefault();
      
      const confirmed = navigationGuard.confirmNavigation();
      if (confirmed) {
        // Clear the unsaved changes state and navigate
        navigationGuard.clearUnsavedChanges();
        router.push(href);
      }
      // If not confirmed, do nothing (stay on current page)
    }
    // If no unsaved changes, let the normal Link behavior handle navigation
  };

  return (
    <Link
      href={href}
      className={className}
      onClick={handleClick}
      tabIndex={tabIndex}
      aria-disabled={ariaDisabled}
      {...props}
    >
      {children}
    </Link>
  );
}