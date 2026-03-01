import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { User, Users } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

interface Partnership {
  id: string;
  user1Id: string;
  user2Id: string;
  inviteCode: string;
  allowAudio: boolean;
  allowVideo: boolean;
  allowRecording: boolean;
  allowAiTone: boolean;
  createdAt: string;
  updatedAt: string;
  coParent: {
    id: string;
    displayName: string;
    profileImageUrl: string | null;
    phoneNumber: string | null;
  } | null;
}

interface CoParentSelectorProps {
  onSelectPartnership: (partnership: Partnership | null) => void;
  selectedPartnershipId?: string;
}

export function CoParentSelector({ onSelectPartnership, selectedPartnershipId }: CoParentSelectorProps) {
  const { user } = useAuth();

  const { data: partnerships = [], isLoading } = useQuery<Partnership[]>({
    queryKey: ["/api/partnerships"],
    enabled: !!user,
  });

  // Auto-select first partnership on initial load
  useEffect(() => {
    if (partnerships.length > 0 && !selectedPartnershipId) {
      onSelectPartnership(partnerships[0]);
    }
  }, [partnerships, selectedPartnershipId, onSelectPartnership]);

  const selectedPartnership = partnerships.find((p) => p.id === selectedPartnershipId);

  const getAvatarContent = (profileImageUrl: string | null) => {
    if (profileImageUrl?.startsWith("emoji:")) {
      return <div className="text-2xl">{profileImageUrl.replace("emoji:", "")}</div>;
    }
    if (profileImageUrl) {
      return <AvatarImage src={profileImageUrl} />;
    }
    return (
      <AvatarFallback>
        <User className="h-5 w-5" />
      </AvatarFallback>
    );
  };

  if (isLoading) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        disabled
        data-testid="button-select-coparent"
      >
        <Users className="h-4 w-4" />
        <span>Loading...</span>
      </Button>
    );
  }

  if (partnerships.length === 0) {
    return (
      <Button
        variant="outline"
        className="w-full justify-start gap-2"
        disabled
        data-testid="button-no-coparents"
      >
        <Users className="h-4 w-4" />
        <span>No co-parents yet</span>
      </Button>
    );
  }

  return (
    <Select
      value={selectedPartnershipId}
      onValueChange={(value) => {
        const partnership = partnerships.find((p) => p.id === value);
        onSelectPartnership(partnership || null);
      }}
    >
      <SelectTrigger className="w-full" data-testid="select-coparent">
        <SelectValue>
          {selectedPartnership ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {getAvatarContent(selectedPartnership.coParent?.profileImageUrl || null)}
              </Avatar>
              <span className="truncate">
                {selectedPartnership.coParent?.displayName}
              </span>
            </div>
          ) : (
            <span>Select co-parent</span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {partnerships.map((partnership) => (
          <SelectItem key={partnership.id} value={partnership.id} data-testid={`select-item-coparent-${partnership.id}`}>
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                {getAvatarContent(partnership.coParent?.profileImageUrl || null)}
              </Avatar>
              <span className="truncate">
                {partnership.coParent?.displayName}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
