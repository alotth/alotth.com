"use client";

import { useState } from "react";
import { Calendar, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DatePickerProps {
  value: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

export function DatePicker({ value, onValueChange, disabled, className, placeholder = "Nenhuma data" }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return null;
    }
  };

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value) {
      // Convert to ISO string for storage
      const date = new Date(value);
      onValueChange(date.toISOString());
    } else {
      onValueChange(null);
    }
    setIsOpen(false);
  };

  const clearDate = (e: React.MouseEvent) => {
    e.stopPropagation();
    onValueChange(null);
  };

  const getInputValue = () => {
    if (!value) return '';
    try {
      const date = new Date(value);
      // Return in YYYY-MM-DD format for input[type="date"]
      return date.toISOString().split('T')[0];
    } catch {
      return '';
    }
  };

  const isOverdue = () => {
    if (!value) return false;
    try {
      const dueDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return dueDate < today;
    } catch {
      return false;
    }
  };

  const formattedDate = formatDate(value);
  const overdue = isOverdue();

  return (
    <div className={`relative ${className || ''}`}>
      <Button
        variant="outline"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-[120px] h-8 px-2 justify-start text-left font-normal text-xs ${
          value ? 'text-foreground' : 'text-muted-foreground'
        } ${overdue ? 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400' : ''}`}
      >
        <Calendar className="mr-1 h-3 w-3" />
        <span className="text-xs truncate">
          {formattedDate || placeholder}
        </span>
        {value && (
          <X 
            className="ml-auto h-3 w-3 hover:text-destructive cursor-pointer flex-shrink-0" 
            onClick={clearDate}
          />
        )}
      </Button>
      
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white dark:bg-gray-900 border border-border rounded-md shadow-lg z-50">
          <input
            type="date"
            value={getInputValue()}
            onChange={handleDateChange}
            className="p-2 border-none focus:outline-none rounded-md bg-transparent text-foreground"
            onBlur={() => setIsOpen(false)}
            autoFocus
          />
        </div>
      )}
    </div>
  );
} 