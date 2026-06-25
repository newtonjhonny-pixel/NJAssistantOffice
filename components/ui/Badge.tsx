import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "secondary" | "destructive" | "outline"
}

export function Badge({ children, className, variant = "default" }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
        variant === "default" && "bg-primary text-primary-foreground border-transparent",
        variant === "secondary" && "bg-secondary text-secondary-foreground border-transparent",
        variant === "destructive" && "bg-destructive text-destructive-foreground border-transparent",
        variant === "outline" && "text-foreground",
        className
      )}
    >
      {children}
    </span>
  )
}
