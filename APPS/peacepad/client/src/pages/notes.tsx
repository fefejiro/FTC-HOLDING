import { useState } from "react";
import { SEOHead } from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, StickyNote } from "lucide-react";
import { TutorialModal } from "@/components/TutorialModal";
import { useFirstTimeTutorial } from "@/hooks/useFirstTimeTutorial";
import { SwipeableCard } from "@/components/SwipeableCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/dateUtils";
import type { Note } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export default function NotesPage() {
  const { toast } = useToast();
  const { showTutorial, closeTutorial } = useFirstTimeTutorial('peacepad_notes_tutorial_seen');
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const { data: notes = [], isLoading } = useQuery<Note[]>({
    queryKey: ["/api/notes"],
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

  const updateNote = useMutation({
    mutationFn: async (data: { id: string; title: string; content: string }) => {
      const res = await apiRequest("PATCH", `/api/notes/${data.id}`, {
        title: data.title,
        content: data.content,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      setNoteDialogOpen(false);
      setEditingNote(null);
      setNoteTitle("");
      setNoteContent("");
      toast({ title: "Note updated successfully", duration: 3000 });
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
      toast({ title: "Error", description: "Failed to update note", variant: "destructive", duration: 5000 });
    },
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/notes/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      toast({ title: "Note deleted successfully", duration: 3000 });
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
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive", duration: 5000 });
    },
  });

  const handleAddNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive", duration: 5000 });
      return;
    }
    if (editingNote) {
      updateNote.mutate({
        id: editingNote.id,
        title: noteTitle,
        content: noteContent,
      });
    } else {
      createNote.mutate({ title: noteTitle, content: noteContent });
    }
  };

  const handleEdit = (note: Note) => {
    setEditingNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
    setNoteDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    deleteNote.mutate(id);
  };

  const handleDialogClose = (open: boolean) => {
    setNoteDialogOpen(open);
    if (!open) {
      setEditingNote(null);
      setNoteTitle("");
      setNoteContent("");
    }
  };

  return (
    <>
      <SEOHead
        title="Notes - PeacePad"
        description="Shared notes"
        noindex={true}
        canonical={(import.meta.env.VITE_BASE_URL || window.location.origin) + '/notes'}
      />
      <TutorialModal
        open={showTutorial}
        onClose={closeTutorial}
        title="How Shared Notes Work"
        storageKey="peacepad_notes_tutorial_seen"
        icon={<StickyNote className="h-5 w-5 text-pink-500" />}
        steps={[
          { title: "Create a Note", description: "Write down information you both need to remember (school info, medical notes, etc.)" },
          { title: "Share with Your Co-Parent", description: "Your notes appear on their screen instantly. One source of truth" },
          { title: "Keep it Updated", description: "Edit or delete notes anytime. Perfect for recording important details" },
        ]}
      />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-20 overflow-x-hidden">
        <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <StickyNote className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Shared Notes</h1>
        </div>
        <Dialog open={noteDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-note">
              <Plus className="h-4 w-4 mr-2" />
              Add Note
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80dvh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingNote ? "Edit Note" : "Create New Note"}</DialogTitle>
              <DialogDescription className="sr-only">
                {editingNote ? "Edit your shared note" : "Create a new shared note with your co-parent"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">
              <div>
                <Label htmlFor="note-title">Title</Label>
                <Input
                  id="note-title"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  placeholder="Note title"
                  data-testid="input-note-title"
                />
              </div>
              <div>
                <Label htmlFor="note-content">Content</Label>
                <Textarea
                  id="note-content"
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Note content"
                  rows={4}
                  data-testid="input-note-content"
                />
              </div>
            </div>
            <div className="flex-shrink-0 pt-4 border-t mt-4">
              <Button 
                onClick={handleAddNote} 
                disabled={createNote.isPending || updateNote.isPending} 
                className="w-full"
                data-testid="button-save-note"
              >
                {createNote.isPending || updateNote.isPending 
                  ? (editingNote ? "Updating..." : "Creating...") 
                  : (editingNote ? "Update Note" : "Create Note")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="p-4 space-y-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : notes.length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="max-w-xs mx-auto space-y-3">
              <div className="inline-flex p-2.5 bg-primary/10 rounded-full">
                <StickyNote className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No Notes Yet</h3>
              <p className="text-sm text-muted-foreground">Create shared notes to keep important information organized and accessible to both parents.</p>
              <Button onClick={() => setNoteDialogOpen(true)} size="sm" data-testid="button-add-first-note">
                <Plus className="h-4 w-4 mr-1.5" />
                Add First Note
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {notes.map((note) => (
            <SwipeableCard
              key={note.id}
              onEdit={() => handleEdit(note)}
              onDelete={() => handleDelete(note.id)}
            >
              <Card className="p-4 bg-[hsl(45_95%_95%)] dark:bg-card border-[hsl(45_50%_80%)] dark:border-card-border">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4 text-[hsl(45_60%_40%)]" />
                    <h3 className="font-medium text-sm text-foreground">{note.title}</h3>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{note.content}</p>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{note.createdBy || "Unknown"}</span>
                  <span className="font-mono">{formatDate.short(note.createdAt || "")}</span>
                </div>
              </Card>
            </SwipeableCard>
          ))}
        </div>
      )}
      </div>
    </>
  );
}
