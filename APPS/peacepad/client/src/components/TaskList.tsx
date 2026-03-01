import { useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Plus } from "lucide-react";
import TaskItem from "./TaskItem";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Task } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AssigneeSelector } from "./AssigneeSelector";
import { LocationAutocomplete } from "./LocationAutocomplete";

interface LocationData {
  displayName: string;
  address: string;
  lat: number;
  lng: number;
}

export default function TaskList() {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDueDate, setTaskDueDate] = useState("");
  const [assignedTo, setAssignedTo] = useState<string | null>(null);
  const [location, setLocation] = useState<LocationData | null>(null);

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const createTask = useMutation({
    mutationFn: async (data: { 
      title: string; 
      dueDate?: string;
      location?: LocationData;
      assignedTo?: string | null;
    }) => {
      const res = await apiRequest("POST", "/api/tasks", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setDialogOpen(false);
      setTaskTitle("");
      setTaskDueDate("");
      setAssignedTo(null);
      setLocation(null);
      toast({ title: "Task created successfully", duration: 3000 });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
          duration: 5000,
        });
        localStorage.removeItem("peacepad_session_id");
        setTimeout(() => {
          window.location.href = "/";
        }, 1000);
        return;
      }
      toast({ title: "Error", description: "Failed to create task", variant: "destructive", duration: 5000 });
    },
  });

  const handleAddTask = () => {
    if (!taskTitle.trim()) {
      toast({ title: "Error", description: "Please enter a task title", variant: "destructive", duration: 5000 });
      return;
    }
    
    createTask.mutate({
      title: taskTitle, 
      dueDate: taskDueDate || undefined,
      assignedTo: assignedTo || undefined,
      location: location || undefined,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <CheckSquare className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Shared Tasks</h2>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              data-testid="button-add-task"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80dvh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Create Task</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">
              <div>
                <Label htmlFor="task-title">Task</Label>
                <Input
                  id="task-title"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  placeholder="e.g., Pick up soccer gear"
                  data-testid="input-task-title"
                />
              </div>
              <div>
                <Label htmlFor="task-due-date">Due Date (optional)</Label>
                <Input
                  id="task-due-date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  placeholder="e.g., Oct 15"
                  data-testid="input-task-due-date"
                />
              </div>
              <div>
                <Label>Assign To (optional)</Label>
                <AssigneeSelector
                  value={assignedTo}
                  onChange={setAssignedTo}
                  disabled={createTask.isPending}
                />
              </div>
              <div>
                <Label>Location (optional)</Label>
                <LocationAutocomplete
                  value={location}
                  onChange={setLocation}
                  placeholder="e.g., Target on Main St"
                  disabled={createTask.isPending}
                />
              </div>
            </div>
            <div className="flex-shrink-0 pt-4 border-t mt-4">
              <Button
                onClick={handleAddTask}
                disabled={createTask.isPending}
                className="w-full"
                data-testid="button-save-task"
              >
                Create Task
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="space-y-1">
        {tasks.length === 0 ? (
          <p className="text-muted-foreground text-sm">No tasks yet. Add one to get started!</p>
        ) : (
          tasks.map((task) => (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              completed={task.completed}
              dueDate={task.dueDate || undefined}
              assignedTo={task.assignedTo || undefined}
              location={(task.location as any) || undefined}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}
