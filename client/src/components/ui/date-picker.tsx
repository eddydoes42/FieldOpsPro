"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, X, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerProps {
  date?: Date
  onDateChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  includeTime?: boolean
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  className,
  disabled,
  includeTime = true
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [selectedDate, setSelectedDate] = React.useState<Date | undefined>(date)
  const [timeValue, setTimeValue] = React.useState<string>(() => {
    if (date && includeTime) {
      return format(date, "HH:mm")
    }
    return "09:00"
  })

  React.useEffect(() => {
    setSelectedDate(date)
    if (date && includeTime) {
      setTimeValue(format(date, "HH:mm"))
    }
  }, [date, includeTime])

  const handleDateSelect = (newDate: Date | undefined) => {
    if (newDate) {
      let finalDate = newDate
      
      if (includeTime && timeValue) {
        const [hours, minutes] = timeValue.split(':').map(Number)
        finalDate = new Date(newDate)
        finalDate.setHours(hours, minutes, 0, 0)
      }
      
      setSelectedDate(finalDate)
      onDateChange?.(finalDate)
    } else {
      setSelectedDate(undefined)
      onDateChange?.(undefined)
    }
  }

  const handleTimeChange = (newTime: string) => {
    setTimeValue(newTime)
    
    if (selectedDate && newTime) {
      const [hours, minutes] = newTime.split(':').map(Number)
      const newDateTime = new Date(selectedDate)
      newDateTime.setHours(hours, minutes, 0, 0)
      
      setSelectedDate(newDateTime)
      onDateChange?.(newDateTime)
    }
  }

  const handleApply = () => {
    setOpen(false)
  }

  const handleClose = () => {
    setOpen(false)
  }

  const formatDisplayDate = (date: Date) => {
    if (includeTime) {
      return format(date, "PPP 'at' p")
    }
    return format(date, "PPP")
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !selectedDate && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {selectedDate ? formatDisplayDate(selectedDate) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="text-sm font-medium">
            {includeTime ? "Select Date & Time" : "Select Date"}
          </h4>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={handleClose}
            data-testid="button-close-date-picker"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
        {includeTime && (
          <div className="p-3 border-t">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Time:</span>
              <Input
                type="time"
                value={timeValue}
                onChange={(e) => handleTimeChange(e.target.value)}
                className="w-32 text-center"
                data-testid="input-time-picker"
              />
            </div>
          </div>
        )}
        {includeTime && (
          <div className="p-3 border-t bg-muted/20">
            <Button
              onClick={handleApply}
              size="sm"
              className="w-full"
              data-testid="button-apply-date-time"
            >
              Apply
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}