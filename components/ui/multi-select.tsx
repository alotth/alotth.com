"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface Option {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  maxDisplayed?: number
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  className,
  maxDisplayed = 1,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  const selectedOptions = options.filter((option) => selected.includes(option.value))
  const filteredOptions = options.filter(option => 
    option.label.toLowerCase().includes(search.toLowerCase())
  )

  const displayText = () => {
    if (selected.length === 0) return "📁"
    if (selected.length === 1) {
      const option = options.find(o => o.value === selected[0])
      return option?.label || "📁"
    }
    return `📁 ${selected.length} projetos`
  }

  return (
    <div className="relative">
      <Button
        variant="outline"
        onClick={() => setOpen(!open)}
        className={cn("justify-between h-6 min-w-[80px] px-2 text-xs", className)}
      >
        <span className="truncate">{displayText()}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-[200px] rounded-md border bg-popover p-1 shadow-md">
          <input
            type="text"
            placeholder="Buscar projetos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-2 py-1 text-xs border rounded-sm bg-background mb-1"
          />
          
          {/* Selected projects with remove buttons */}
          {selected.length > 0 && (
            <div className="border-b pb-1 mb-1">
              {selectedOptions.map((option) => (
                <div
                  key={option.value}
                  className="flex items-center justify-between px-2 py-1 text-xs bg-accent/50 rounded-sm mb-1"
                >
                  <span className="truncate">{option.label}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUnselect(option.value)
                    }}
                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                  >
                    <X className="h-2 w-2" />
                  </button>
                </div>
              ))}
            </div>
          )}

                          <div className="max-h-32 overflow-consistent">
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-1 text-xs text-muted-foreground">
                Nenhum projeto encontrado
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  onClick={() => {
                    onChange(
                      selected.includes(option.value)
                        ? selected.filter((item) => item !== option.value)
                        : [...selected, option.value]
                    )
                  }}
                  className="flex items-center w-full px-2 py-1 text-xs hover:bg-accent rounded-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 w-3",
                      selected.includes(option.value) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="truncate">{option.label}</span>
                </button>
              ))
            )}
          </div>

          <button
            onClick={() => setOpen(false)}
            className="absolute top-1 right-1 hover:bg-accent rounded-full p-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      )}

      {/* Overlay to close dropdown */}
      {open && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}
    </div>
  )
} 