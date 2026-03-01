import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Heart } from "lucide-react";
import ChildUpdateCard from "@/components/ChildUpdateCard";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/dateUtils";
import type { ChildUpdate } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { SEOHead } from "@/components/SEOHead";
import { SwipeableCard } from "@/components/SwipeableCard";
import { hapticSuccess } from "@/lib/haptics";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
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
import { validateTitle, validateDescription } from "@/lib/fieldValidation";

export default function ChildUpdatesPage() {
  const { toast } = useToast();
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [editingUpdate, setEditingUpdate] = useState<ChildUpdate | null>(null);
  const [childName, setChildName] = useState("");
  const [updateText, setUpdateText] = useState("");

  const { data: updates = [], isLoading } = useQuery<ChildUpdate[]>({
    queryKey: ["/api/child-updates"],
  });

  const createUpdate = useMutation({
    mutationFn: async (data: { childName: string; update: string }) => {
      const res = await apiRequest("POST", "/api/child-updates", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/child-updates"] });
      setUpdateDialogOpen(false);
      setEditingUpdate(null);
      setChildName("");
      setUpdateText("");
      hapticSuccess();
      toast({
        title: "✓ Update shared!",
        description: "Your co-parent will see this update",
        duration: 2500,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        // ... unauthorized handling
        return;
      }
      
      const errorMessage = error.message.includes("No active partnership")
        ? "Please set up a partnership in Settings first to share updates."
        : "Failed to create update. Please try again.";

      toast({ 
        title: "Partnership Required", 
        description: errorMessage, 
        variant: "destructive", 
        duration: 5000 
      });
    },
  });

  const updateChildUpdate = useMutation({
    mutationFn: async (data: { id: string; childName: string; update: string }) => {
      const res = await apiRequest("PATCH", `/api/child-updates/${data.id}`, {
        childName: data.childName,
        update: data.update,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/child-updates"] });
      setUpdateDialogOpen(false);
      setEditingUpdate(null);
      setChildName("");
      setUpdateText("");
      toast({
        title: "✓ Update edited",
        description: "Changes saved successfully",
        duration: 2500,
      });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to edit update", variant: "destructive", duration: 5000 });
    },
  });

  const deleteUpdate = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/child-updates/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/child-updates"] });
      toast({ title: "Update deleted successfully", duration: 3000 });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete update", variant: "destructive", duration: 5000 });
    },
  });

  const handleAddUpdate = () => {
    const nameValidation = validateTitle(childName);
    if (!nameValidation.valid) {
      toast({ title: "Invalid name", description: nameValidation.error, variant: "destructive", duration: 5000 });
      return;
    }
    const updateValidation = validateDescription(updateText);
    if (!updateValidation.valid) {
      toast({ title: "Invalid update", description: updateValidation.error, variant: "destructive", duration: 5000 });
      return;
    }
    if (editingUpdate) {
      updateChildUpdate.mutate({ id: editingUpdate.id, childName, update: updateText });
    } else {
      createUpdate.mutate({ childName, update: updateText });
    }
  };

  const handleEditUpdate = (update: ChildUpdate) => {
    setEditingUpdate(update);
    setChildName(update.childName);
    setUpdateText(update.update);
    setUpdateDialogOpen(true);
  };

  const handleDeleteUpdate = (id: string) => {
    deleteUpdate.mutate(id);
  };

  const handleDialogClose = (open: boolean) => {
    setUpdateDialogOpen(open);
    if (!open) {
      setEditingUpdate(null);
      setChildName("");
      setUpdateText("");
    }
  };

  if (isLoading) {
    return (
      <>
        <SEOHead title="Child Updates" description="Share updates about your children" noindex />
        <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-20">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <Heart className="h-8 w-8 text-primary fill-primary" />
              <h1 className="text-3xl font-bold text-foreground">Child Updates</h1>
            </div>
            <Skeleton className="h-9 w-32" />
          </div>
          <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <div className="flex items-center justify-between pt-2">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <SEOHead title="Child Updates" description="Share updates about your children" noindex />
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Heart className="h-8 w-8 text-primary fill-primary" />
          <h1 className="text-3xl font-bold text-foreground">Child Updates</h1>
        </div>
        <Dialog open={updateDialogOpen} onOpenChange={handleDialogClose}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-child-update">
              <Plus className="h-4 w-4 mr-2" />
              Add Update
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80dvh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>{editingUpdate ? "Edit Child Update" : "Share Child Update"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">
              <div>
                <Label htmlFor="child-name">Child's Name</Label>
                <Input
                  id="child-name"
                  value={childName}
                  onChange={(e) => setChildName(e.target.value)}
                  placeholder="Enter child's name"
                  data-testid="input-child-name"
                />
              </div>
              <div>
                <Label htmlFor="update-text">Update</Label>
                <Textarea
                  id="update-text"
                  value={updateText}
                  onChange={(e) => setUpdateText(e.target.value)}
                  placeholder="What's new with your child?"
                  rows={4}
                  data-testid="input-update-text"
                />
              </div>
            </div>
            <div className="flex-shrink-0 pt-4 border-t mt-4">
              <Button onClick={handleAddUpdate} disabled={editingUpdate ? updateChildUpdate.isPending : createUpdate.isPending} className="w-full" data-testid="button-save-update">
                {editingUpdate 
                  ? (updateChildUpdate.isPending ? "Updating..." : "Update") 
                  : (createUpdate.isPending ? "Sharing..." : "Share Update")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {updates.length === 0 ? (
        <Card className="rounded-2xl shadow-sm">
          <CardContent className="p-6 sm:p-8 text-center">
            <div className="max-w-xs mx-auto space-y-3">
              <div className="inline-flex p-2.5 bg-primary/10 rounded-full">
                <Heart className="h-6 w-6 text-primary fill-primary" />
              </div>
              <h3 className="text-base font-semibold text-foreground">No Updates Yet</h3>
              <p className="text-sm text-muted-foreground">Share updates about your children to keep everyone informed and connected.</p>
              <Button onClick={() => setUpdateDialogOpen(true)} size="sm" data-testid="button-add-first-update">
                <Plus className="h-4 w-4 mr-1.5" />
                Add First Update
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-1 lg:grid-cols-2">
          {updates.map((update) => (
            <SwipeableCard
              key={update.id}
              onEdit={() => handleEditUpdate(update)}
              onDelete={() => handleDeleteUpdate(update.id)}
            >
              <ChildUpdateCard
                childName={update.childName}
                update={update.update}
                author={update.createdBy || "Unknown"}
                timestamp={formatDate.dateTime(update.createdAt || "")}
              />
            </SwipeableCard>
          ))}
        </div>
      )}
    </div>
    </>
  );
}
