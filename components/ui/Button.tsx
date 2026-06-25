import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary"
  size?: "sm" | "md" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed gap-2",
          size === "sm" && "text-xs px-3 py-1.5",
          size === "md" && "text-sm px-4 py-2",
          size === "lg" && "text-base px-6 py-3",
          variant === "default" && "bg-blue-600 text-white hover:bg-blue-700 shadow-sm",
          variant === "outline" && "border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300",
          variant === "ghost" && "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
          variant === "secondary" && "bg-slate-100 text-slate-700 hover:bg-slate-200",
          variant === "destructive" && "bg-red-600 text-white hover:bg-red-700",
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"
