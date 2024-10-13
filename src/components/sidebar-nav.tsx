"use client"
import React from 'react'
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

interface SidebarNavProps extends React.HTMLAttributes<HTMLElement> {
  items: {
    href: string
    title: string
  }[]
  disabled?: boolean
}

export function SidebarNav({ className, items, disabled = false, ...props }: SidebarNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
      {...props}
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            pathname === item.href
              ? "bg-muted hover:bg-muted"
              : "hover:bg-transparent hover:underline",
            "justify-start",
            disabled && "cursor-not-allowed"
          )}
          onClick={disabled ? (e) => e.preventDefault() : undefined}
          tabIndex={disabled ? -1 : undefined}
          aria-disabled={disabled}
        >
          {item.title}
        </Link>
      ))}
    </nav>
  )
}