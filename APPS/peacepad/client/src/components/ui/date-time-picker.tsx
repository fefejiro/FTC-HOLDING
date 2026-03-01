import * as React from "react"
import { format, parse } from "date-fns"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  "data-testid"?: string
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  "data-testid": testId,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selectedDate = React.useMemo(() => {
    if (!value) return undefined
    try {
      return new Date(value)
    } catch {
      return undefined
    }
  }, [value])

  const timeValue = React.useMemo(() => {
    if (!selectedDate) return "12:00"
    const hours = selectedDate.getHours().toString().padStart(2, "0")
    const minutes = selectedDate.getMinutes().toString().padStart(2, "0")
    return `${hours}:${minutes}`
  }, [selectedDate])

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) {
      onChange("")
      return
    }

    const currentTime = selectedDate || new Date()
    date.setHours(currentTime.getHours())
    date.setMinutes(currentTime.getMinutes())
    date.setSeconds(0)
    date.setMilliseconds(0)

    onChange(date.toISOString().slice(0, 16))
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = e.target.value
    if (!time) return

    const [hours, minutes] = time.split(":").map(Number)
    const date = selectedDate ? new Date(selectedDate) : new Date()
    date.setHours(hours)
    date.setMinutes(minutes)
    date.setSeconds(0)
    date.setMilliseconds(0)

    onChange(date.toISOString().slice(0, 16))
  }

  const displayValue = React.useMemo(() => {
    if (!selectedDate) return placeholder
    return format(selectedDate, "MMM d, yyyy 'at' h:mm a")
  }, [selectedDate, placeholder])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal min-w-0",
            !selectedDate && "text-muted-foreground"
          )}
          data-testid={testId}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{displayValue}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleDateSelect}
          initialFocus
        />
        <div className="border-t p-3">
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            <Input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className="w-full"
              data-testid={testId ? `${testId}-time` : undefined}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
