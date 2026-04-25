import * as React from "react"

import { cn } from "@/lib/utils/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground/60 selection:bg-primary selection:text-primary-foreground border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] flex h-8 w-full min-w-0 rounded-md border text-sm px-3 py-1.5 transition-[border-color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
        "focus-visible:border-ring/60 focus-visible:ring-1 focus-visible:ring-ring/30",
        "aria-invalid:border-destructive/60 aria-invalid:ring-1 aria-invalid:ring-destructive/30",
        className
      )}
      {...props}
    />
  )
}

export { Input }
