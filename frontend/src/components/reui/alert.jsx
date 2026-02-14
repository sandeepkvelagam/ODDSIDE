import * as React from "react"
import { cn } from "@/lib/utils"

const Alert = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "relative grid w-full items-start gap-y-0.5 rounded-lg border p-4 text-sm",
      className
    )}
    {...props}
  />
))
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "col-start-2 flex flex-wrap items-center gap-x-2 font-medium leading-none tracking-tight",
      className
    )}
    {...props}
  />
))
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "col-start-2 text-sm text-muted-foreground [&_p]:leading-relaxed",
      className
    )}
    {...props}
  />
))
AlertDescription.displayName = "AlertDescription"

const AlertAction = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("col-start-2 mt-2 flex items-center gap-2", className)}
    {...props}
  />
))
AlertAction.displayName = "AlertAction"

export { Alert, AlertTitle, AlertDescription, AlertAction }
