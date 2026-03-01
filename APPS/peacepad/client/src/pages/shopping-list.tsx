import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ShoppingList, ShoppingItem } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ShoppingCart, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { SEOHead } from "@/components/SEOHead";
import { SwipeableCard } from "@/components/SwipeableCard";
import { Label } from "@/components/ui/label";

export default function ShoppingListPage() {
  const { toast } = useToast();
  const { user } = useAuth();

  return (
    <>
      <SEOHead title="Shopping Lists - Coming Soon" description="Shared shopping lists for co-parenting" noindex />
      <div className="flex items-center justify-center h-full p-6">
        <Card className="rounded-3xl border-2 border-dashed max-w-sm w-full">
          <CardContent className="p-8 sm:p-12 text-center">
            <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
              <ShoppingCart className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-foreground mb-3">Coming Soon</h1>
            <p className="text-muted-foreground mb-6">
              Shared shopping lists are coming to PeacePad. Create coordinated shopping lists with your co-parent to stay organized.
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium mb-2">Planned Features:</p>
              <ul className="space-y-1 text-left">
                <li>✓ Shared shopping lists</li>
                <li>✓ Item tracking across parents</li>
                <li>✓ Quantity management</li>
                <li>✓ Real-time updates</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
