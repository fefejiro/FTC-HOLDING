import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import NoteCard from "./NoteCard";
import TaskList from "./TaskList";
import ChildUpdateCard from "./ChildUpdateCard";
import PetManagement from "./PetManagement";
import ExpenseTracking from "./ExpenseTracking";
import { AgentInsights } from "./AgentInsights";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/dateUtils";
import type { Note, ChildUpdate } from "@shared/schema";
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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function Dashboard() {
  const { toast } = useToast();
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");

  const { data: notes = [] } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
  });

  const { data: updates = [] } = useQuery<ChildUpdate[]>({
    queryKey: ["/api/child-updates"],
  });

  const createNote = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const res = await apiRequest("POST", "/api/notes", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNoteDialogOpen(false);
      setNoteTitle("");
      setNoteContent("");
      toast({ title: "Note created successfully", duration: 3000 });
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
      toast({ title: "Error", description: "Failed to create note", variant: "destructive", duration: 5000 });
    },
  });

  const handleAddNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive", duration: 5000 });
      return;
    }
    createNote.mutate({ title: noteTitle, content: noteContent });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fade-in overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Family Dashboard</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">Keep your family organized together</p>
        </div>
      </div>

      {/* AI Coach Insights */}
      <AgentInsights />

      {/* Main Content Grid */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2">
        {/* Shared Notes Section */}
        <div className="space-y-4 animate-slide-up">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Shared Notes</h2>
            <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5 shadow-sm"
                  data-testid="button-add-note"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Add Note</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl">
                <DialogHeader>
                  <DialogTitle className="text-2xl">Create a New Note</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="note-title" className="text-sm font-medium">Title</Label>
                    <Input
                      id="note-title"
                      value={noteTitle}
                      onChange={(e) => setNoteTitle(e.target.value)}
                      placeholder="Enter note title..."
                      className="rounded-xl"
                      data-testid="input-note-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="note-content" className="text-sm font-medium">Content</Label>
                    <Textarea
                      id="note-content"
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="What would you like to remember?"
                      className="rounded-xl min-h-[120px]"
                      data-testid="input-note-content"
                    />
                  </div>
                  <Button
                    onClick={handleAddNote}
                    disabled={createNote.isPending}
                    className="w-full rounded-xl shadow-sm"
                    data-testid="button-save-note"
                  >
                    {createNote.isPending ? "Creating..." : "Create Note"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <div className="space-y-3">
            {notes.length === 0 ? (
              <div className="p-8 text-center bg-accent/20 rounded-2xl border border-accent/30 animate-scale-in">
                <p className="text-muted-foreground text-sm">No notes yet. Create your first one to get started!</p>
              </div>
            ) : (
              notes.map((note) => (
                <div key={note.id} className="animate-slide-up">
                  <NoteCard
                    id={note.id}
                    title={note.title}
                    content={note.content}
                    createdBy="You"
                    date={formatDate.short(note.createdAt)}
                  />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Tasks & Updates Column */}
        <div className="space-y-6 animate-slide-up" style={{animationDelay: "100ms"}}>
          <TaskList />
          
          <div className="space-y-4">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground">Child Updates</h2>
            <div className="space-y-3">
              {updates.length === 0 ? (
                <div className="p-8 text-center bg-accent/20 rounded-2xl border border-accent/30 animate-scale-in">
                  <p className="text-muted-foreground text-sm">No updates yet. Share your first update!</p>
                </div>
              ) : (
                updates.map((update) => (
                  <div key={update.id} className="animate-slide-up">
                    <ChildUpdateCard
                      childName={update.childName}
                      update={update.update}
                      author="You"
                      timestamp={formatDate.dateTime(update.createdAt)}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Grid - Pets & Expenses */}
      <div className="grid gap-5 sm:gap-6 lg:grid-cols-2 animate-slide-up" style={{animationDelay: "200ms"}}>
        <PetManagement />
        <ExpenseTracking />
      </div>
    </div>
  );
}
