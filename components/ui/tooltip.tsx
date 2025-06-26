"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TooltipProps {
  children: React.ReactNode
  content: string
  side?: "top" | "bottom" | "left" | "right"
  className?: string
}

export function Tooltip({ 
  children, 
  content, 
  side = "bottom", 
  className 
}: TooltipProps) {
  const [isVisible, setIsVisible] = React.useState(false)

  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2", 
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2"
  }

  return (
    <div 
      className="relative inline-block"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          className={cn(
            "absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded-md shadow-lg whitespace-nowrap",
            "animate-in fade-in-0 zoom-in-95 duration-200",
            sideClasses[side],
            className
          )}
        >
          {content}
          {/* Arrow */}
          <div
            className={cn(
              "absolute w-2 h-2 bg-gray-900 rotate-45",
              side === "bottom" && "top-0 left-1/2 -translate-x-1/2 -translate-y-1/2",
              side === "top" && "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2",
              side === "right" && "left-0 top-1/2 -translate-y-1/2 -translate-x-1/2",
              side === "left" && "right-0 top-1/2 -translate-y-1/2 translate-x-1/2"
            )}
          />
        </div>
      )}
    </div>
  )
} 