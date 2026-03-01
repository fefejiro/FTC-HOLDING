import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PawPrint, Plus, Calendar, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pet } from "@shared/schema";
import { SEOHead } from "@/components/SEOHead";
import { SwipeableCard } from "@/components/SwipeableCard";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";

export default function PetsPage() {
  const { toast } = useToast();

  return (
    <>
      <SEOHead 
        title="Pet Management - Coming Soon" 
        description="Manage your pets and track their care schedules and expenses" 
        noindex 
      />
      <div className="flex items-center justify-center h-full p-6">
        <Card className="rounded-3xl border-2 border-dashed max-w-sm w-full">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
              <PawPrint className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">Coming Soon</h1>
            <p className="text-muted-foreground mb-6">
              Pet management is coming to PeacePad. Track pet care schedules, expenses, and responsibilities with your co-parent.
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Planned Features:</p>
              <ul className="space-y-1 text-left">
                <li>✓ Pet profiles & care history</li>
                <li>✓ Shared care schedules</li>
                <li>✓ Expense tracking</li>
                <li>✓ Veterinary appointments</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
