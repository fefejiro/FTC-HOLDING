import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DollarSign, Plus } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { ShareToChatButton } from "./ShareToChatButton";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@shared/schema";

export default function ExpenseTracking() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const { toast } = useToast();

  const { data: expenses = [] } = useQuery<Expense[]>({
    queryKey: ["/api/expenses"],
  });

  const createExpense = useMutation({
    mutationFn: async (data: { description: string; amount: string; category: string }) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setDialogOpen(false);
      setDescription("");
      setAmount("");
      setCategory("");
      toast({ title: "Expense added successfully", duration: 3000 });
    },
    onError: () => {
      toast({ title: "Failed to add expense", variant: "destructive", duration: 5000 });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount || !category) return;
    createExpense.mutate({ description, amount, category });
  };

  const totalExpenses = expenses.reduce((sum, exp) => sum + parseFloat(exp.amount || "0"), 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Expense Tracking
          </CardTitle>
          <CardDescription>Track and split shared expenses</CardDescription>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" data-testid="button-add-expense">
              <Plus className="h-4 w-4 mr-1" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80dvh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle>Add Expense</DialogTitle>
              <DialogDescription>Record a shared expense</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1 flex flex-col">
              <div>
                <Label htmlFor="expense-description">Description</Label>
                <Input
                  id="expense-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g., School supplies"
                  data-testid="input-expense-description"
                />
              </div>
              <div>
                <Label htmlFor="expense-amount">Amount</Label>
                <Input
                  id="expense-amount"
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  data-testid="input-expense-amount"
                />
              </div>
              <div>
                <Label htmlFor="expense-category">Category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger data-testid="select-expense-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="school">School</SelectItem>
                    <SelectItem value="medical">Medical</SelectItem>
                    <SelectItem value="activities">Activities</SelectItem>
                    <SelectItem value="clothing">Clothing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </form>
            <div className="flex-shrink-0 pt-4 border-t mt-4">
              <Button type="submit" disabled={createExpense.isPending} className="w-full" onClick={handleSubmit} data-testid="button-save-expense">
                {createExpense.isPending ? "Adding..." : "Add Expense"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-3 bg-accent/50 rounded-lg">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-semibold">${totalExpenses.toFixed(2)}</p>
        </div>
        {expenses.length === 0 ? (
          <p className="text-sm text-muted-foreground">No expenses recorded yet</p>
        ) : (
          <div className="space-y-2">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border hover-elevate gap-2" data-testid={`expense-${expense.id}`}>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{expense.description}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="capitalize text-xs">{expense.category}</Badge>
                    <Badge variant={expense.status === "pending" ? "secondary" : "default"} className="text-xs capitalize">
                      {expense.status}
                    </Badge>
                  </div>
                </div>
                <p className="font-semibold flex-shrink-0">${parseFloat(expense.amount).toFixed(2)}</p>
                <ShareToChatButton
                  itemType="expense"
                  itemId={expense.id}
                  itemTitle={expense.description}
                />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
