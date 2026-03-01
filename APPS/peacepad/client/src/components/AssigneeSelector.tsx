import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle } from "lucide-react";

interface User {
  id: string;
  displayName: string;
  profileImageUrl: string | null;
  firstName?: string;
  lastName?: string;
}

interface AssigneeSelectorProps {
  value?: string | null;
  onChange: (userId: string | null) => void;
  disabled?: boolean;
}

export function AssigneeSelector({ value, onChange, disabled = false }: AssigneeSelectorProps) {
  // Fetch all partnered users
  const { data: partnerships } = useQuery<any[]>({
    queryKey: ['/api/partnerships'],
  });

  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/auth/user'],
  });

  // Build list of all users (current user + all co-parents from partnerships)
  const allUsers: User[] = [];
  
  if (currentUser) {
    allUsers.push(currentUser);
  }

  if (partnerships) {
    partnerships.forEach((partnership) => {
      const coParent = partnership.user1Id === currentUser?.id 
        ? partnership.user2
        : partnership.user1;
      
      if (coParent && !allUsers.some(u => u.id === coParent.id)) {
        allUsers.push({
          id: coParent.id,
          displayName: coParent.displayName || `${coParent.firstName || ''} ${coParent.lastName || ''}`.trim() || 'Co-Parent',
          profileImageUrl: coParent.profileImageUrl,
          firstName: coParent.firstName,
          lastName: coParent.lastName,
        });
      }
    });
  }

  const getInitials = (user: User) => {
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    return user.displayName?.[0]?.toUpperCase() || '?';
  };

  return (
    <Select 
      value={value || "unassigned"} 
      onValueChange={(val) => onChange(val === "unassigned" ? null : val)}
      disabled={disabled}
    >
      <SelectTrigger className="w-full" data-testid="select-assignee">
        <SelectValue placeholder="Assign to..." />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="unassigned" data-testid="assignee-option-unassigned">
          <div className="flex items-center gap-2">
            <UserCircle className="h-4 w-4 text-muted-foreground" />
            <span>Unassigned</span>
          </div>
        </SelectItem>
        
        {allUsers.map((user) => (
          <SelectItem 
            key={user.id} 
            value={user.id}
            data-testid={`assignee-option-${user.id}`}
          >
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={user.profileImageUrl || undefined} />
                <AvatarFallback className="text-xs">
                  {getInitials(user)}
                </AvatarFallback>
              </Avatar>
              <span>{user.displayName}</span>
              {user.id === currentUser?.id && (
                <span className="text-xs text-muted-foreground">(You)</span>
              )}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
