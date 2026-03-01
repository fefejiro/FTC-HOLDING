import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Video, PhoneMissed, PhoneIncoming, PhoneOutgoing, AlertCircle, Calendar as CalendarIcon, Clock, Shell, MessageSquare } from "lucide-react";
import { formatDistanceToNow, format, isFuture, isPast } from "date-fns";
import { SEOHead } from "@/components/SEOHead";
import type { ConchSession } from "@shared/schema";

type CallStatus = 'ringing' | 'active' | 'ended' | 'missed' | 'declined';
type CallType = 'audio' | 'video';

interface Call {
  id: string;
  callerId: string;
  receiverId: string;
  partnershipId: string | null;
  callType: CallType;
  status: CallStatus;
  reason?: string | null;
  isEmergency?: boolean;
  startedAt: string | null;
  endedAt: string | null;
  duration: string | null;
  declineReason: string | null;
  createdAt: string;
}

interface Partnership {
  id: string;
  userId: string;
  partnerId: string;
  partner: {
    id: string;
    displayName: string;
    profileImageUrl: string | null;
  } | null;
  status: string;
}

interface ScheduledCall {
  id: string;
  schedulerId: string;
  participantId: string;
  partnershipId: string | null;
  callType: 'audio' | 'video';
  scheduledFor: string;
  title: string;
  notes: string | null;
  reason: string | null;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  reminderSent: boolean;
  createdAt: string;
}

export default function CallsPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: partnerships = [] } = useQuery<Partnership[]>({
    queryKey: ['/api/partnerships'],
    enabled: !!user,
  });

  // Get active partnership from existing partnerships query
  const activePartnership = partnerships?.find(p => p.id === user?.activePartnershipId);

  // Fetch Conch session history
  const { data: conchHistory = [], isLoading } = useQuery<ConchSession[]>({
    queryKey: ['/api/conch-sessions/history', user?.activePartnershipId],
    queryFn: async () => {
      if (!user?.activePartnershipId) return [];
      const res = await fetch(`/api/conch-sessions/history?partnershipId=${user.activePartnershipId}`, { 
        credentials: "include" 
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user?.activePartnershipId,
  });

  // Export conch history as CSV for audit purposes
  const handleExport = () => {
    if (conchHistory.length === 0) return;
    
    const headers = ['Date', 'Time', 'Duration', 'Status', 'Initiator', 'Participant', 'Participant Mood', 'Notes'];
    const rows = conchHistory.map(session => {
      const duration = session.startedAt && session.endedAt 
        ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
        : 0;
      const durationStr = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
      const initiatorName = activePartnership && session.initiatorUserId === user?.id 
        ? user?.displayName || 'Me'
        : activePartnership?.partner?.displayName || 'Partner';
      const participantName = activePartnership && session.initiatorUserId !== user?.id 
        ? user?.displayName || 'Me'
        : activePartnership?.partner?.displayName || 'Partner';
      return [
        new Date(session.createdAt).toLocaleDateString(),
        new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        durationStr,
        session.status || 'completed',
        initiatorName,
        participantName,
        'N/A',
        ''
      ];
    });
    
    const csv = [headers, ...rows].map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conch-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <>
      <SEOHead title="Conch History" description="View your Conch session history for audit and reference" noindex />
      <div className="flex flex-col pb-20">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2" data-testid="text-conch-history-title">Conch History</h1>
          <p className="text-sm text-muted-foreground mb-4">
            View all your structured conversation sessions with detailed information
          </p>

          {/* CTA to start new session */}
          <Button
            onClick={() => setLocation("/conch-mode")}
            className="gap-2 w-full sm:w-auto"
            data-testid="button-start-new-conch-session"
          >
            <Shell className="h-4 w-4" />
            Start New Session
          </Button>

          {/* Export button - visible when there's history */}
          {conchHistory.length > 0 && (
            <Button
              onClick={handleExport}
              variant="outline"
              className="gap-2 w-full sm:w-auto mt-3"
              data-testid="button-export-conch-history"
            >
              <MessageSquare className="h-4 w-4" />
              Export as CSV
            </Button>
          )}
        </div>

        {/* Conch History List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center h-40">
              <div className="text-muted-foreground">Loading session history...</div>
            </div>
          ) : conchHistory.length === 0 ? (
            <Card className="p-6 sm:p-8 text-center">
              <Shell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-lg font-medium text-foreground">No sessions yet</p>
              <p className="text-sm text-muted-foreground mt-2 mb-4">
                Start a Conch session to begin structured conversations with your co-parent
              </p>
              <Button
                onClick={() => setLocation("/conch-mode")}
                className="gap-2"
                data-testid="button-start-session-empty"
              >
                <Shell className="h-4 w-4" />
                Start Session
              </Button>
            </Card>
          ) : (
            <div className="space-y-3">
              {conchHistory.map((session) => {
                const duration = session.startedAt && session.endedAt 
                  ? Math.round((new Date(session.endedAt).getTime() - new Date(session.startedAt).getTime()) / 1000)
                  : 0;
                const durationStr = `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`;
                const isInitiator = session.initiatorUserId === user?.id;
                
                return (
                  <Card key={session.id} className="p-4 hover-elevate active-elevate-2" data-testid={`card-conch-session-${session.id}`}>
                    <div className="space-y-2">
                      {/* Date and Time */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shell className="h-4 w-4 text-primary" />
                          <span className="font-medium text-sm">
                            {new Date(session.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Duration and Status */}
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {durationStr} mins
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {session.status || 'Completed'}
                        </Badge>
                        {isInitiator && (
                          <Badge className="text-xs">Initiated by you</Badge>
                        )}
                      </div>

                      {/* Participants */}
                      <div className="text-xs text-muted-foreground">
                        <p>With: {activePartnership?.partner?.displayName || 'Your co-parent'}</p>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
