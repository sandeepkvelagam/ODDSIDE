import * as React from "react"
import { cn } from "@/lib/utils"

const Frame = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("w-full", className)}
    {...props}
  />
))
Frame.displayName = "Frame"

const FramePanel = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-xl border bg-card shadow-sm", className)}
    {...props}
  />
))
FramePanel.displayName = "FramePanel"

export { Frame, FramePanel }
