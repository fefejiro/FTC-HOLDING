import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PawPrint, Plus, Calendar, DollarSign } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Pet } from "@shared/schema";

export default function PetManagement() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [petName, setPetName] = useState("");
  const [petType, setPetType] = useState("");
  const { toast } = useToast();

  const { data: pets = [] } = useQuery<Pet[]>({
    queryKey: ["/api/pets"],
  });

  const createPet = useMutation({
    mutationFn: async (data: { name: string; type: string }) => {
      const res = await apiRequest("POST", "/api/pets", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/pets"] });
      setDialogOpen(false);
      setPetName("");
      setPetType("");
      toast({ title: "Pet added successfully", duration: 3000 });
    },
    onError: () => {
      toast({ title: "Failed to add pet", variant: "destructive", duration: 5000 });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!petName.trim() || !petType.trim()) return;
    createPet.mutate({ name: petName, type: petType });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <PawPrint className="h-5 w-5" />
            Pet Management
          </CardTitle>
          <CardDescription>Track pet care and custody schedules</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-pet">
              <Plus className="h-4 w-4 mr-1" />
              Add Pet
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Pet</DialogTitle>
              <DialogDescription>Add a pet to track care and custody</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="pet-name">Pet Name</Label>
                <Input
                  id="pet-name"
                  value={petName}
                  onChange={(e) => setPetName(e.target.value)}
                  placeholder="e.g., Max, Bella"
                  data-testid="input-pet-name"
                />
              </div>
              <div>
                <Label htmlFor="pet-type">Type</Label>
                <Input
                  id="pet-type"
                  value={petType}
                  onChange={(e) => setPetType(e.target.value)}
                  placeholder="e.g., Dog, Cat, Bird"
                  data-testid="input-pet-type"
                />
              </div>
              <Button type="submit" disabled={createPet.isPending} data-testid="button-save-pet">
                {createPet.isPending ? "Adding..." : "Add Pet"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {pets.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pets added yet</p>
        ) : (
          <div className="space-y-3">
            {pets.map((pet) => (
              <div key={pet.id} className="flex items-center gap-3 p-3 rounded-lg border hover-elevate" data-testid={`pet-${pet.id}`}>
                <PawPrint className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <p className="font-medium">{pet.name}</p>
                  <p className="text-sm text-muted-foreground capitalize">{pet.type}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Calendar className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline">
                    <DollarSign className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
