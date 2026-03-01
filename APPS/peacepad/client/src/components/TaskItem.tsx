import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin } from "lucide-react";
import { ShareToChatButton } from "./ShareToChatButton";

interface LocationData {
  displayName: string;
  address: string;
  lat: number;
  lng: number;
}

interface TaskItemProps {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  assignedTo?: string | null;
  location?: LocationData | null;
}

export default function TaskItem({ id, title, completed, dueDate, assignedTo, location }: TaskItemProps) {
  const { toast } = useToast();
  
  // Location is already an object from the API
  const locationData = location;

  // Fetch assigned user info if assignedTo is set
  const { data: assignedUser } = useQuery<any>({
    queryKey: ['/api/users', assignedTo],
    enabled: !!assignedTo,
  });

  const getInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user?.displayName?.[0]?.toUpperCase() || '?';
  };

  const updateTask = useMutation({
    mutationFn: async (newCompleted: boolean) => {
      const res = await apiRequest("PATCH", `/api/tasks/${id}`, { completed: newCompleted });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
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
      toast({ title: "Error", description: "Failed to update task", variant: "destructive", duration: 5000 });
    },
  });

  const handleToggle = (checked: boolean) => {
    updateTask.mutate(checked);
  };

  return (
    <div className="flex items-center gap-3 p-2 rounded-lg hover-elevate active-elevate-2">
      <Checkbox
        checked={completed}
        onCheckedChange={handleToggle}
        id={`task-${id}`}
        data-testid={`checkbox-task-${id}`}
      />
      <div className="flex-1 min-w-0">
        <label
          htmlFor={`task-${id}`}
          className={`block text-sm cursor-pointer ${
            completed ? "line-through text-muted-foreground" : "text-foreground"
          }`}
        >
          {title}
        </label>
        {locationData && (
          <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            <span className="truncate">{locationData.displayName || locationData.address}</span>
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {assignedUser && (
          <div 
            className="flex items-center gap-1.5" 
            title={`Assigned to ${assignedUser.displayName || assignedUser.firstName}`}
            data-testid={`task-assignee-${id}`}
          >
            <Avatar className="h-6 w-6">
              <AvatarImage src={assignedUser.profileImageUrl || undefined} />
              <AvatarFallback className="text-xs">
                {getInitials(assignedUser)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {assignedUser.firstName || assignedUser.displayName}
            </span>
          </div>
        )}
        {dueDate && (
          <span className="text-xs font-mono text-muted-foreground">{dueDate}</span>
        )}
        <ShareToChatButton
          itemType="task"
          itemId={id}
          itemTitle={title}
        />
      </div>
    </div>
  );
}
