import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Storybook, StoryPage } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Book, Plus, Edit2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { SEOHead } from "@/components/SEOHead";

export default function StorybookCreatorPage() {
  const { toast } = useToast();

  return (
    <>
      <SEOHead title="Story Creator - Coming Soon" description="Create collaborative stories with your children" noindex />
      <div className="flex items-center justify-center h-full p-6">
        <Card className="rounded-3xl border-2 border-dashed max-w-sm w-full">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
              <Book className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">Coming Soon</h1>
            <p className="text-muted-foreground mb-6">
              Story Creator is coming to PeacePad. Create collaborative stories with your children that both parents can contribute to and enjoy.
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Planned Features:</p>
              <ul className="space-y-1 text-left">
                <li>✓ Collaborative storywriting</li>
                <li>✓ Multi-page books</li>
                <li>✓ Shared with co-parent</li>
                <li>✓ Memory creation for children</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
