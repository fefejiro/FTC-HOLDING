import { cn } from "@/lib/utils";
import { useState, useRef } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, Plus, Circle, CheckCircle2, MapPin, Check, Trash2, CalendarDays } from "lucide-react";
import { TasksHeader } from "@/components/TasksHeader";
import { TutorialModal } from "@/components/TutorialModal";
import { useFirstTimeTutorial } from "@/hooks/useFirstTimeTutorial";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { formatDate } from "@/lib/dateUtils";
import type { Task, Partnership } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { SwipeableCard } from "@/components/SwipeableCard";
import { hapticSuccess } from "@/lib/haptics";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";
import { PullToRefreshIndicator } from "@/components/PullToRefreshIndicator";
import { trackPositiveAction } from "@/components/AppRatingPrompt";
import { DateTimePicker } from "@/components/ui/date-time-picker";
import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TasksPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { showTutorial, closeTutorial } = useFirstTimeTutorial('peacepad_tasks_tutorial_seen');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [location, setLocation] = useState("");
  const [assignedTo, setAssignedTo] = useState("none");
  
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);

  const titleRef = useRef<HTMLInputElement>(null);
  const dueDateRef = useRef<HTMLInputElement>(null);
  const locationRef = useRef<HTMLInputElement>(null);

  const handleEnterKey = (e: React.KeyboardEvent, nextRef?: React.RefObject<any>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (nextRef?.current) {
        nextRef.current?.focus();
      } else {
        handleCreateTask();
      }
    }
  };

  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
  });

  const { data: partnerships = [] } = useQuery<any[]>({
    queryKey: ["/api/partnerships"],
  });

  const { data: tasks = [], isLoading, refetch } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await refetch();
    },
    isRefreshing: isLoading,
  });

  const activePartnership = useMemo(() => {
    if (!user?.activePartnershipId || partnerships.length === 0) return undefined;
    return partnerships.find(p => p.id === user.activePartnershipId);
  }, [partnerships, user?.activePartnershipId]);

  const createTask = useMutation({
    mutationFn: async (data: any) => {
      if (!activePartnership) {
        throw new Error("No active partnership. Please join or create a partnership first.");
      }
      const res = await apiRequest("POST", "/api/tasks", {
        ...data,
        partnershipId: activePartnership.id
      });
      return await res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setDialogOpen(false);
      setTitle("");
      setDueDate("");
      setLocation("");
      setAssignedTo("none");
      toast({ title: "Task created successfully", duration: 3000 });
    },
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { completed });
      return await res.json();
    },
    onSuccess: async (updatedTask: Task) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      if (updatedTask.completed) {
        hapticSuccess();
        trackPositiveAction('task-completed');
        toast({ title: "✓ Task completed!", duration: 2000 });
      }
    },
  });

  const updateTask = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/tasks/${data.id}`, data);
      return await res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setDialogOpen(false);
      setEditingTask(null);
      toast({ title: "Task updated successfully", duration: 3000 });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/tasks/${id}`, {});
      return await res.json();
    },
    onSuccess: async () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({ title: "Task deleted successfully", duration: 3000 });
    },
  });

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setTitle(task.title || "");
    setDueDate(task.dueDate || "");
    setLocation(task.location || "");
    setAssignedTo(task.assignedTo || "none");
    setDialogOpen(true);
  };

  const handleDelete = (task: Task) => {
    setTaskToDelete(task);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      deleteTask.mutate(taskToDelete.id);
      setDeleteDialogOpen(false);
      setTaskToDelete(null);
    }
  };

  const handleCreateTask = () => {
    if (!title.trim()) return;
    if (editingTask) {
      updateTask.mutate({ id: editingTask.id, title, dueDate: dueDate || undefined, location: location || undefined, assignedTo: assignedTo === "none" ? undefined : assignedTo });
    } else {
      createTask.mutate({ title, dueDate: dueDate || undefined, location: location || undefined, assignedTo: assignedTo === "none" ? undefined : assignedTo, completed: false });
    }
  };

  const handleDialogOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      setEditingTask(null);
      setTitle("");
      setDueDate("");
      setLocation("");
      setAssignedTo("none");
    }
  };

  const toggleTaskSelection = (taskId: string) => {
    const newSelection = new Set(selectedTaskIds);
    if (newSelection.has(taskId)) newSelection.delete(taskId);
    else newSelection.add(taskId);
    setSelectedTaskIds(newSelection);
  };

  const handleBulkComplete = async () => {
    const incomplete = tasks.filter(t => selectedTaskIds.has(t.id) && !t.completed);
    await Promise.all(incomplete.map(t => apiRequest("PATCH", `/api/tasks/${t.id}`, { completed: true })));
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    setIsSelectionMode(false);
    setSelectedTaskIds(new Set());
  };

  const confirmBulkDelete = async () => {
    await Promise.all(Array.from(selectedTaskIds).map(id => apiRequest("DELETE", `/api/tasks/${id}`, {})));
    queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
    setBulkDeleteDialogOpen(false);
    setIsSelectionMode(false);
    setSelectedTaskIds(new Set());
  };

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

  if (isLoading) return <div className="p-4 flex flex-col items-center"><Skeleton className="h-[140px] w-full max-w-2xl rounded-b-3xl" /><div className="w-full max-w-2xl mt-8 space-y-4">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}</div></div>;

  return (
    <>
      <SEOHead title="Tasks - PeacePad" description="Shared tasks" noindex />
      <TutorialModal open={showTutorial} onClose={closeTutorial} title="Tasks" storageKey="peacepad_tasks_tutorial_seen" steps={[{ title: "Add", description: "Add tasks" }, { title: "Track", description: "Track progress" }]} />
      
      <div ref={pullToRefresh.containerRef} className="flex flex-col items-center min-h-full bg-background">
        <div className="w-full max-w-2xl">
          <TasksHeader totalTasks={tasks.length} incompleteTasks={incompleteTasks.length} />
          <div className="px-4 py-3 flex justify-center">
            <div className="inline-flex gap-2 p-2 bg-card rounded-3xl border border-border/50">
              <button onClick={() => setIsSelectionMode(!isSelectionMode)} className={cn("px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-200", isSelectionMode ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>{isSelectionMode ? "Cancel" : "Select"}</button>
              <button onClick={() => setDialogOpen(true)} className="px-4 py-1.5 rounded-full text-sm font-medium bg-primary text-primary-foreground shadow-sm hover-elevate active-elevate-2 flex items-center gap-1"><Plus className="h-4 w-4" /> Add Task</button>
            </div>
          </div>
        </div>

        <PullToRefreshIndicator {...pullToRefresh} />
        
        <div className="w-full max-w-2xl px-4 space-y-6 pb-32">
          {incompleteTasks.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center gap-4">
              <div className="p-4 bg-primary/10 rounded-full"><CheckSquare className="h-12 w-12 text-primary" /></div>
              <h3 className="text-2xl font-bold">All Caught Up!</h3>
              <p className="text-muted-foreground">Everything is done for now.</p>
              <Button onClick={() => setDialogOpen(true)} className="h-12 px-8 rounded-xl font-bold"><Plus className="h-5 w-5 mr-2" />Add Task</Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-lg font-bold">To Do ({incompleteTasks.length})</h2>
              {incompleteTasks.map((task) => (
                <SwipeableCard key={task.id} onEdit={() => handleEdit(task)} onDelete={() => handleDelete(task)}>
                  <Card className={cn("hover-elevate border-none shadow-sm rounded-2xl", isSelectionMode && selectedTaskIds.has(task.id) && "ring-2 ring-primary")} onClick={() => isSelectionMode && toggleTaskSelection(task.id)}>
                    <CardContent className="p-4 flex items-start gap-4">
                      <button onClick={(e) => { e.stopPropagation(); isSelectionMode ? toggleTaskSelection(task.id) : toggleTask.mutate({ id: task.id, completed: true }); }} className="mt-0.5 shrink-0">
                        {isSelectionMode ? <div className={cn("h-6 w-6 rounded-full border-2 flex items-center justify-center", selectedTaskIds.has(task.id) ? "bg-primary border-primary" : "border-muted-foreground/30")}>{selectedTaskIds.has(task.id) && <Check className="h-4 w-4 text-primary-foreground" />}</div> : <Circle className="h-6 w-6 text-muted-foreground/30" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold truncate">{task.title}</h3>
                        <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                          {task.dueDate && <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{formatDate.short(task.dueDate)}</div>}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </SwipeableCard>
              ))}
            </div>
          )}
          {completedTasks.length > 0 && (
            <div className="space-y-4 pt-4 border-t">
              <h2 className="text-lg font-bold text-muted-foreground/50">Done ({completedTasks.length})</h2>
              {completedTasks.map(task => <Card key={task.id} className="opacity-50 border-none bg-muted/30 rounded-2xl"><CardContent className="p-4 flex items-center gap-4"><CheckCircle2 className="h-6 w-6 text-primary" /><span className="line-through">{task.title}</span></CardContent></Card>)}
            </div>
          )}
        </div>

        {isSelectionMode && selectedTaskIds.size > 0 && (
          <div className="fixed bottom-24 left-0 right-0 z-50 flex gap-3 justify-center px-4"><Button onClick={handleBulkComplete} className="rounded-full h-14 px-8 font-bold"><Check className="h-5 w-5 mr-2" /> Complete ({selectedTaskIds.size})</Button><Button variant="destructive" onClick={() => setBulkDeleteDialogOpen(true)} className="rounded-full h-14 px-8 font-bold">Delete</Button></div>
        )}

        <Dialog open={dialogOpen && !isSelectionMode} onOpenChange={handleDialogOpenChange}>
          <DialogContent className="max-w-lg w-[95vw] max-h-[90vh] overflow-y-auto rounded-t-[32px] sm:rounded-2xl">
            <DialogHeader><DialogTitle className="text-2xl font-black">{editingTask ? "Edit Task" : "New Task"}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground">Task</Label>
                <Input 
                  ref={titleRef} 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  onKeyDown={(e) => handleEnterKey(e, dueDateRef)} 
                  className="h-12 rounded-xl" 
                  placeholder="e.g., Buy groceries"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Due</Label>
                  <DateTimePicker
                    value={dueDate}
                    onChange={setDueDate}
                    placeholder="Pick a date"
                    data-testid="input-task-due"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase text-muted-foreground">Who</Label>
                  <Select value={assignedTo} onValueChange={setAssignedTo}>
                    <SelectTrigger className="h-12 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {user && <SelectItem value={user.id}>Me</SelectItem>}
                      {activePartnership && (
                        <SelectItem value={user?.id === activePartnership.user1Id ? activePartnership.user2Id : activePartnership.user1Id}>
                          Co-Parent
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="ghost" onClick={() => handleDialogOpenChange(false)} className="rounded-xl h-12">Cancel</Button>
              <Button onClick={handleCreateTask} disabled={createTask.isPending || updateTask.isPending} className="h-12 px-8 font-black rounded-xl">
                {editingTask ? "Save Changes" : "Create Task"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Delete Task</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmDelete} className="bg-destructive rounded-xl">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
        <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}><AlertDialogContent className="rounded-2xl"><AlertDialogHeader><AlertDialogTitle>Delete Tasks</AlertDialogTitle></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel><AlertDialogAction onClick={confirmBulkDelete} className="bg-destructive rounded-xl">Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      </div>
    </>
  );
}
