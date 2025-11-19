"use client"

import * as React from "react"
import { Eye, EyeOff } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type PasswordInputProps = React.ComponentPropsWithoutRef<typeof Input> & {
  containerClassName?: string
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, containerClassName, type, ...props }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false)

    return (
      <div className={cn("relative", containerClassName)}>
        <Input
          ref={ref}
          type={showPassword ? "text" : "password"}
          className={cn("pr-10", className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setShowPassword((prev) => !prev)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
        </button>
      </div>
    )
  }
)

PasswordInput.displayName = "PasswordInput"
