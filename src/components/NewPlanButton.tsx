/**
 * NewPlanButton - Dropdown button for creating new training plans
 *
 * Provides two options:
 * - Generate with AI
 * - Create manually
 */

import { Plus, Sparkles, PenLine, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface NewPlanButtonProps {
  /** Variant: "nav" for navigation bar, "button" for button style */
  variant?: "nav" | "button";
  /** Current path for active state highlighting */
  currentPath?: string;
}

export function NewPlanButton({ variant = "nav", currentPath = "" }: NewPlanButtonProps) {
  const isActive = currentPath.startsWith("/generate") || currentPath.startsWith("/plans/new");

  if (variant === "nav") {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger
          className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground"
          }`}
          aria-label="Nowy plan"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="size-4"
          >
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
            <path d="M20 3v4" />
            <path d="M22 5h-4" />
            <path d="M4 17v2" />
            <path d="M5 18H3" />
          </svg>
          <span className="hidden sm:inline">Nowy plan</span>
          <ChevronDown className="size-3 opacity-50" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuItem asChild>
            <a href="/generate" className="flex cursor-pointer items-center gap-2">
              <Sparkles className="size-4" />
              <div className="flex flex-col">
                <span className="font-medium">Generuj przez AI</span>
                <span className="text-xs text-muted-foreground">Spersonalizowany plan</span>
              </div>
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/plans/new" className="flex cursor-pointer items-center gap-2">
              <PenLine className="size-4" />
              <div className="flex flex-col">
                <span className="font-medium">Utwórz manualnie</span>
                <span className="text-xs text-muted-foreground">Stwórz od podstaw</span>
              </div>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Button variant (used in PageHeader)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50">
          <Plus className="size-4" />
          Nowy plan
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <a href="/generate" className="flex cursor-pointer items-center gap-2">
            <Sparkles className="size-4" />
            <div className="flex flex-col">
              <span className="font-medium">Generuj przez AI</span>
              <span className="text-xs text-muted-foreground">Spersonalizowany plan treningowy</span>
            </div>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href="/plans/new" className="flex cursor-pointer items-center gap-2">
            <PenLine className="size-4" />
            <div className="flex flex-col">
              <span className="font-medium">Utwórz manualnie</span>
              <span className="text-xs text-muted-foreground">Stwórz plan od podstaw</span>
            </div>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
