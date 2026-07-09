"use client";
import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-blue-600 text-white " +
    "hover:bg-blue-700 hover:shadow-md hover:shadow-blue-200 hover:-translate-y-px " +
    "active:translate-y-0 active:shadow-none active:brightness-95",
  secondary:
    "bg-gray-100 text-gray-800 border border-gray-200 " +
    "hover:bg-gray-200 hover:border-gray-300 hover:shadow-sm hover:-translate-y-px " +
    "active:translate-y-0 active:shadow-none",
  danger:
    "bg-red-600 text-white " +
    "hover:bg-red-700 hover:shadow-md hover:shadow-red-200 hover:-translate-y-px " +
    "active:translate-y-0 active:shadow-none active:brightness-95",
  ghost:
    "bg-transparent text-gray-600 " +
    "hover:bg-gray-100 hover:text-gray-900 hover:-translate-y-px " +
    "active:translate-y-0",
};

const sizes = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center gap-2 rounded-lg font-medium",
        "transition-all duration-150 ease-out",
        "cursor-pointer select-none",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
