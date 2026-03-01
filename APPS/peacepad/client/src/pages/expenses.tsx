import { useState } from "react";
import { useLocation } from "wouter";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Upload, FileText, CheckCircle, Clock, XCircle, ArrowRight, AlertTriangle, HelpCircle, Plus, Sparkles } from "lucide-react";
import { ExpensesHeader } from "@/components/ExpensesHeader";
import { ExpensesTabs } from "@/components/ExpensesTabs";
import { ExpensesEmptyState } from "@/components/ExpensesEmptyState";
import { CategorySelector } from "@/components/CategorySelector";
import { SplitSelector } from "@/components/SplitSelector";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/dateUtils";
import type { Expense } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { SwipeableCard } from "@/components/SwipeableCard";
import { ImageUploadPreview } from "@/components/ImageUploadPreview";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TutorialModal } from "@/components/TutorialModal";
import { useFirstTimeTutorial } from "@/hooks/useFirstTimeTutorial";
import { ConnectWithPartner } from "@/components/ConnectWithPartner";

interface EnrichedExpense extends Expense {
  userPercentage?: string;
  userOwedAmount?: string;
  userPaidAmount?: string;
  isSoloExpense?: boolean;
}

interface Settlement {
  id: string;
  expenseId: string;
  payerId: string;
  receiverId: string;
  partnershipId: string;
  amount: string;
  method: string;
  paymentLink: string | null;
  status: string;
  initiatedAt: Date;
  confirmedAt: Date | null;
  rejectedAt: Date | null;
  rejectedReason: string | null;
}

interface PartnershipBalance {
  partnershipId: string;
  userId: string;
  netBalance: string;
  lastUpdated: Date;
}

interface Partnership {
  id: string;
  user1Id: string;
  user2Id: string;
  inviteCode: string;
}

export default function ExpensesPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editingExpense, setEditingExpense] = useState<EnrichedExpense | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("childcare");
  const [userPercentage, setUserPercentage] = useState("50");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploadedReceipt, setUploadedReceipt] = useState<{ receiptUrl: string; fileName: string; fileSize: string } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("mark_paid");
  const [paymentLink, setPaymentLink] = useState("");
  const [settlementAmount, setSettlementAmount] = useState("");
  const [filterTab, setFilterTab] = useState<"all" | "mine" | "theirs" | "pending" | "settled">("all");
  const { showTutorial, closeTutorial, openTutorial } = useFirstTimeTutorial('peacepad_expenses_tutorial_seen');

  const { data: user } = useQuery<any>({ queryKey: ["/api/auth/user"] });
  const { data: partnerships = [] } = useQuery<Partnership[]>({ 
    queryKey: ["/api/partnerships"],
    staleTime: 30000, // Cache for 30 seconds
  });
  const activePartnership = partnerships.find(p => p.id === user?.activePartnershipId);
  const { data: expenses = [], isLoading } = useQuery<EnrichedExpense[]>({ queryKey: ["/api/expenses"] });
  
  const { data: balances = {} } = useQuery<Record<string, PartnershipBalance>>({
    queryKey: ["/api/balances", ...partnerships.map(p => p.id)],
    queryFn: async () => {
      const balanceMap: Record<string, PartnershipBalance> = {};
      for (const partnership of partnerships) {
        const res = await fetch(`/api/partnerships/${partnership.id}/balance`, { credentials: "include" });
        if (res.ok) {
          const balance = await res.json();
          balanceMap[partnership.id] = balance;
        }
      }
      return balanceMap;
    },
    enabled: partnerships.length > 0,
  });

  const { data: expenseSettlements = {} } = useQuery<Record<string, Settlement[]>>({
    queryKey: ["/api/expense-settlements", ...expenses.map(e => e.id)],
    queryFn: async () => {
      const settlementsMap: Record<string, Settlement[]> = {};
      for (const expense of expenses) {
        const res = await fetch(`/api/expenses/${expense.id}/settlements`, { credentials: "include" });
        if (res.ok) {
          const settlements = await res.json();
          settlementsMap[expense.id] = settlements;
        }
      }
      return settlementsMap;
    },
    enabled: expenses.length > 0,
  });

  const { data: pendingSettlements = [] } = useQuery<Settlement[]>({ queryKey: ["/api/settlements/pending"] });

  const confirmSettlement = useMutation({
    mutationFn: async (settlementId: string) => {
      const res = await apiRequest("PATCH", `/api/settlements/${settlementId}/confirm`, {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expense-settlements"] });
      toast({ title: "Settlement confirmed", description: "Payment has been marked as received", duration: 3000 });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to confirm settlement", variant: "destructive", duration: 5000 });
    },
  });

  const disputeSettlement = useMutation({
    mutationFn: async ({ settlementId, reason }: { settlementId: string; reason: string }) => {
      const res = await apiRequest("PATCH", `/api/settlements/${settlementId}/dispute`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/settlements/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      toast({ title: "Settlement disputed", description: "Your co-parent will be notified", duration: 3000 });
    },
  });

  const uploadReceipt = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/receipt-upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      return await res.json();
    },
    onSuccess: (data) => {
      setUploadedReceipt(data);
      toast({ title: "Receipt uploaded successfully", duration: 3000 });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload receipt", variant: "destructive", duration: 5000 });
    },
  });

  const createExpense = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/expenses", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      setDialogOpen(false);
      setEditingExpense(null);
      setDescription("");
      setAmount("");
      setCategory("childcare");
      setUserPercentage("50");
      setReceiptFile(null);
      setUploadedReceipt(null);
      toast({ title: "Expense created successfully", duration: 3000 });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to create expense", variant: "destructive", duration: 5000 });
    },
  });

  const updateExpense = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("PATCH", `/api/expenses/${data.id}`, { description: data.description, amount: data.amount, category: data.category });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      setDialogOpen(false);
      setEditingExpense(null);
      setDescription("");
      setAmount("");
      setCategory("childcare");
      toast({ title: "Expense updated successfully", duration: 3000 });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to update expense", variant: "destructive", duration: 5000 });
    },
  });

  const deleteExpense = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/expenses/${id}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      toast({ title: "Expense deleted successfully", duration: 3000 });
    },
  });

  const initiateSettlement = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/settlements/initiate", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/balances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/settlements/pending"] });
      setSettleDialogOpen(false);
      setSelectedExpense(null);
      setSettlementAmount("");
      toast({ title: "Settlement initiated", duration: 3000 });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to initiate settlement", variant: "destructive", duration: 5000 });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive", duration: 5000 });
      return;
    }
    setReceiptFile(file);
    uploadReceipt.mutate(file);
  };

  const handleCreateExpense = () => {
    if (!description.trim() || !amount.trim()) {
      toast({ title: "Error", description: "Please fill in all required fields", variant: "destructive", duration: 5000 });
      return;
    }

    if (editingExpense) {
      updateExpense.mutate({ id: editingExpense.id, description, amount, category });
    } else {
      if (!user) {
        toast({ title: "Error", description: "User information not loaded. Please try again.", variant: "destructive", duration: 5000 });
        return;
      }
      
      // Solo mode: create expense without partnership
      if (!activePartnership) {
        createExpense.mutate({ 
          description, 
          amount, 
          category, 
          partnershipId: null, 
          splitPercentages: { [user.id]: 100 }, 
          receiptUrl: uploadedReceipt?.receiptUrl, 
          fileName: uploadedReceipt?.fileName, 
          fileSize: uploadedReceipt?.fileSize 
        });
      } else {
        // Partnership mode: split with co-parent
        const userPct = parseInt(userPercentage);
        const partnerPct = 100 - userPct;
        const partnerId = activePartnership.user1Id === user.id ? activePartnership.user2Id : activePartnership.user1Id;
        createExpense.mutate({ description, amount, category, partnershipId: activePartnership.id, splitPercentages: { [user.id]: userPct, [partnerId]: partnerPct }, receiptUrl: uploadedReceipt?.receiptUrl, fileName: uploadedReceipt?.fileName, fileSize: uploadedReceipt?.fileSize });
      }
    }
  };

  const handleEditExpense = (expense: EnrichedExpense) => {
    setEditingExpense(expense);
    setDescription(expense.description);
    setAmount(expense.amount);
    setCategory(expense.category);
    setDialogOpen(true);
  };

  const handleDeleteExpense = (id: string) => {
    deleteExpense.mutate(id);
  };

  const handleSettleUp = (expense: Expense) => {
    setSelectedExpense(expense);
    
    // Automatically calculate the amount user owes based on split percentage
    let calculatedAmount = expense.amount;
    
    // Find the participant entry for the current user to get their percentage
    // In a real app, this would be fetched from the expenseParticipants table
    // For now, we'll try to derive it from the enriched expense or default to 50%
    if (user && (expense as EnrichedExpense).userOwedAmount) {
      calculatedAmount = (expense as EnrichedExpense).userOwedAmount || expense.amount;
    } else if (user && activePartnership) {
      // Fallback: if we don't have userOwedAmount pre-calculated, we'd ideally calculate it here
      // But we'll trust the amount passed if it's already filtered/enriched
    }
    
    setSettlementAmount(calculatedAmount);
    setSettleDialogOpen(true);
  };

  const handleInitiateSettlement = () => {
    if (!selectedExpense || !settlementAmount) {
      toast({ title: "Error", description: "Please enter a settlement amount", variant: "destructive", duration: 5000 });
      return;
    }
    initiateSettlement.mutate({ expenseId: selectedExpense.id, partnershipId: selectedExpense.partnershipId, amount: settlementAmount, method: paymentMethod, paymentLink: paymentLink || undefined });
  };

  const getStatusColor = () => {
    // New intro slide theme - consistent dark card background
    return "bg-card border-border/30";
  };
  
  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "paid": return "bg-green-500/20 text-green-700 dark:text-green-400";
      case "pending": return "bg-amber-500/20 text-amber-700 dark:text-amber-400";
      case "settled": return "bg-blue-500/20 text-blue-700 dark:text-blue-400";
      default: return "bg-gray-500/20 text-gray-700 dark:text-gray-400";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid": return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case "pending": return <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "settled": return <CheckCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      default: return <XCircle className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getExpenseForSettlement = (settlementExpenseId: string) => {
    return expenses.find(e => e.id === settlementExpenseId);
  };


  if (isLoading) {
    return <div className="flex items-center justify-center h-full p-6"><p className="text-muted-foreground">Loading expenses...</p></div>;
  }

  // Solo mode allowed - no partnership blocking

  // Compute balance and status for header
  const balance = activePartnership && balances[activePartnership.id] 
    ? parseFloat(balances[activePartnership.id].netBalance)
    : 0;
  
  const balanceStatus: "positive" | "owing" | "owed" = 
    balance > 0 ? "owed" : balance < 0 ? "owing" : "positive";

  // Filter expenses based on active tab
  const filteredExpenses = expenses.filter(expense => {
    if (filterTab === "settled") return expense.status === "settled" || expense.status === "paid";
    if (filterTab === "pending") return expense.status === "pending";
    if (filterTab === "mine") return expense.paidBy === user?.id;
    if (filterTab === "theirs") return expense.paidBy !== user?.id;
    return true;
  });

  return (
    <>
      <SEOHead title="Expenses - PeacePad" description="Shared expense tracking" noindex={true} canonical={(import.meta.env.VITE_BASE_URL || window.location.origin) + '/expenses'} />
      
      <TutorialModal
        open={showTutorial}
        onClose={closeTutorial}
        title="How Expenses Work"
        storageKey="peacepad_expenses_tutorial_seen"
        steps={[
          { title: "Add an Expense", description: "One parent enters an expense for the child (e.g., $200 for childcare)" },
          { title: "Choose the Split", description: "Decide how to split it (50/50, 60/40, or any percentage)" },
          { title: "Track Payment", description: "Both parents see what they owe and can mark payments as made" },
        ]}
      />

      <div 
        className="flex flex-col flex-1 min-h-0 bg-background"
        style={{ overscrollBehavior: 'contain' }}
      >
        <div className="flex-1 overflow-y-auto overflow-x-hidden w-full max-w-2xl mx-auto min-h-0">
          {activePartnership && (
            <div className="sticky top-0 z-10 bg-background">
              <ExpensesHeader 
                balance={`${balance >= 0 ? '+' : ''}$${Math.abs(balance).toFixed(2)}`}
                status={balanceStatus}
              />
              <ExpensesTabs activeTab={filterTab} onTabChange={setFilterTab} />
            </div>
          )}
          <div className="max-w-6xl mx-auto p-4 space-y-4 pb-4">
            {pendingSettlements.length > 0 && (
              <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-300 dark:border-amber-700">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100"><Clock className="h-5 w-5" />Pending Settlement Confirmations ({pendingSettlements.length})</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {pendingSettlements.map((settlement) => {
                    const expense = getExpenseForSettlement(settlement.expenseId);
                    const isReceiver = user && settlement.receiverId === user.id;
                    return (
                      <Card key={settlement.id} className="bg-card">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground mb-1">{expense?.description || "Expense"}</h4>
                              <p className="text-2xl font-bold text-foreground mb-2">${parseFloat(settlement.amount).toFixed(2)}</p>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p>Payment method: <span className="capitalize">{settlement.method.replace(/_/g, ' ')}</span></p>
                                {settlement.paymentLink && <p>Link: <a href={settlement.paymentLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{settlement.paymentLink}</a></p>}
                                <p className="text-xs">{formatDate.short(settlement.initiatedAt)}</p>
                              </div>
                            </div>
                            <div className="flex flex-col gap-2">
                              {isReceiver ? (
                                <>
                                  <Button size="sm" onClick={() => confirmSettlement.mutate(settlement.id)} disabled={confirmSettlement.isPending} data-testid={`button-confirm-${settlement.id}`}>
                                    <CheckCircle className="h-4 w-4 mr-1" />Confirm
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => { const reason = prompt("Why are you disputing this settlement?"); if (reason) disputeSettlement.mutate({ settlementId: settlement.id, reason }); }} disabled={disputeSettlement.isPending} data-testid={`button-dispute-${settlement.id}`}>
                                    <XCircle className="h-4 w-4 mr-1" />Dispute
                                  </Button>
                                </>
                              ) : (
                                <Badge variant="outline">Awaiting confirmation</Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </CardContent>
              </Card>
            )}


            <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) { setEditingExpense(null); setDescription(""); setAmount(""); setCategory("childcare"); setUserPercentage("50"); setReceiptFile(null); setUploadedReceipt(null); } }}>
              <DialogContent className="max-h-[80dvh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>{editingExpense ? "Edit Expense" : "Create Expense"}</DialogTitle>
                  <DialogDescription className="sr-only">{editingExpense ? "Edit an existing expense" : "Create and split a new expense with your co-parent"}</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">
                  <div>
                    <Label htmlFor="expense-description">Description</Label>
                    <Input id="expense-description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="e.g., School supplies, Medical bills" data-testid="input-expense-description" />
                  </div>
                  <div>
                    <Label htmlFor="amount">Amount ($)</Label>
                    <Input id="amount" type="number" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" data-testid="input-amount" />
                  </div>
                  <CategorySelector value={category} onChange={setCategory} />
                  {!editingExpense && (
                    <>
                      <SplitSelector value={userPercentage} onChange={setUserPercentage} />
                      <div>
                        <Label>Receipt (Optional)</Label>
                        <div className="mt-2 space-y-2">
                          <input type="file" accept="image/*,application/pdf" onChange={handleFileSelect} className="hidden" id="receipt-upload" data-testid="input-receipt-file" />
                          {!receiptFile && !uploadedReceipt && (
                            <label htmlFor="receipt-upload">
                              <Button type="button" variant="outline" className="w-full" disabled={uploadReceipt.isPending} onClick={() => document.getElementById("receipt-upload")?.click()} data-testid="button-upload-receipt">
                                <Upload className="h-4 w-4 mr-2" />Upload Receipt
                              </Button>
                            </label>
                          )}
                          {receiptFile && <ImageUploadPreview file={receiptFile} onRemove={() => { setReceiptFile(null); setUploadedReceipt(null); }} compressImage={receiptFile.type.startsWith('image/')} />}
                          {uploadedReceipt && !receiptFile && (
                            <div className="flex items-center gap-2 p-2 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-md">
                              <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <p className="text-sm text-green-700 dark:text-green-300 flex-1 truncate">{uploadedReceipt.fileName}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-shrink-0 pt-4 border-t mt-4">
                  <Button onClick={handleCreateExpense} disabled={editingExpense ? updateExpense.isPending : createExpense.isPending} className="w-full" data-testid="button-save-expense">
                    {editingExpense ? (updateExpense.isPending ? "Updating..." : "Update Expense") : (createExpense.isPending ? "Creating..." : "Create Expense")}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={settleDialogOpen} onOpenChange={setSettleDialogOpen}>
              <DialogContent className="max-h-[80dvh] flex flex-col">
                <DialogHeader className="flex-shrink-0">
                  <DialogTitle>Settle Expense</DialogTitle>
                  <DialogDescription>How would you like to settle this payment?</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">
                  <div>
                    <Label htmlFor="settle-amount">Amount to Pay ($)</Label>
                    <div className="relative">
                      <Input 
                        id="settle-amount" 
                        type="number" 
                        step="0.01" 
                        value={settlementAmount} 
                        onChange={(e) => setSettlementAmount(e.target.value)} 
                        placeholder="0.00" 
                        className="pl-8"
                        data-testid="input-settle-amount" 
                      />
                      <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                    {selectedExpense && (
                      <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3 text-primary" />
                        Suggested based on split: ${ (selectedExpense as EnrichedExpense).userOwedAmount || (parseFloat(selectedExpense.amount) / 2).toFixed(2) }
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="mark_paid">Mark as Paid (Already settled)</SelectItem>
                        <SelectItem value="e_transfer">E-Transfer</SelectItem>
                        <SelectItem value="paypal">PayPal</SelectItem>
                        <SelectItem value="venmo">Venmo</SelectItem>
                        <SelectItem value="cash">Cash</SelectItem>
                        <SelectItem value="check">Check</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentMethod !== "mark_paid" && (
                    <div>
                      <Label>Payment Link (Optional)</Label>
                      <Input value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://paypal.me/..." data-testid="input-payment-link" />
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0 pt-4 border-t mt-4">
                  <Button onClick={handleInitiateSettlement} disabled={initiateSettlement.isPending} className="w-full" data-testid="button-create-settlement">
                    {initiateSettlement.isPending ? "Creating..." : "Create Settlement"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <div className="grid gap-4">
              {filteredExpenses.length === 0 && expenses.length === 0 ? (
                <ExpensesEmptyState onAddExpense={() => setDialogOpen(true)} />
              ) : filteredExpenses.length === 0 ? (
                <Card className="rounded-2xl shadow-sm bg-card/50 mx-4 mt-4">
                  <CardContent className="p-8 text-center">
                    <p className="text-muted-foreground">No expenses in this category yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {filteredExpenses.map((expense) => {
                    const userOwed = expense.userOwedAmount ? parseFloat(expense.userOwedAmount) : 0;
                    const userPaid = expense.userPaidAmount ? parseFloat(expense.userPaidAmount) : 0;
                    const remaining = Math.max(0, userOwed - userPaid);
                    return (
                      <SwipeableCard key={expense.id} onEdit={() => handleEditExpense(expense)} onDelete={() => handleDeleteExpense(expense.id)}>
                        <Card className={`${getStatusColor()} hover-elevate mx-4 rounded-xl shadow-sm`} data-testid={`expense-card-${expense.id}`}>
                          <CardContent className="p-4">
                            <div className="space-y-3">
                              {/* Header: Title, Category Badge, Amount */}
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <h3 className="font-semibold text-foreground text-base leading-tight">{expense.description}</h3>
                                  <p className="text-xs text-muted-foreground mt-1">{expense.category.charAt(0).toUpperCase() + expense.category.slice(1)} • {formatDate.short(expense.createdAt)}</p>
                                </div>
                                <p className="text-2xl font-bold text-foreground flex-shrink-0 whitespace-nowrap">${parseFloat(expense.amount).toFixed(2)}</p>
                              </div>

                              {/* Status badge */}
                              <div className="flex items-center gap-2">
                                <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(expense.status)}`}>
                                  {getStatusIcon(expense.status)}
                                  <span className="capitalize">{expense.status}</span>
                                </div>
                              </div>

                              {expense.userPercentage && (
                                <div className="pt-2 border-t border-border/20 grid grid-cols-2 gap-2">
                                  <div className="flex flex-col">
                                    <p className="text-xs text-muted-foreground">You owe</p>
                                    <p className="text-sm font-semibold text-foreground">${userOwed.toFixed(2)}</p>
                                    <p className="text-xs text-muted-foreground mt-1">({expense.userPercentage}%)</p>
                                  </div>
                                  <div className="flex flex-col">
                                    <p className="text-xs text-muted-foreground">Paid</p>
                                    <p className="text-sm font-semibold text-green-600 dark:text-green-400">${userPaid.toFixed(2)}</p>
                                    <p className={`text-xs font-medium mt-1 ${remaining > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}`}>
                                      {remaining > 0 ? `$${remaining.toFixed(2)} left` : "Settled"}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {expense.receiptUrl && (
                                <div className="flex items-center gap-2">
                                  <Button variant="outline" size="sm" asChild className="text-xs">
                                    <a href={expense.receiptUrl} target="_blank" rel="noopener noreferrer" data-testid="link-view-receipt">
                                      <FileText className="h-3 w-3 mr-1" />
                                      Receipt
                                    </a>
                                  </Button>
                                </div>
                              )}

                              {expenseSettlements[expense.id] && expenseSettlements[expense.id].length > 0 && (
                                <div className="pt-2 border-t border-border/20">
                                  <div className="space-y-1.5 text-xs">
                                    {expenseSettlements[expense.id].slice(0, 2).map((settlement) => (
                                      <div key={settlement.id} className="flex items-center justify-between text-muted-foreground">
                                        <span className="capitalize">{settlement.method.replace(/_/g, ' ')}</span>
                                        <Badge variant={settlement.status === 'confirmed' ? 'default' : settlement.status === 'rejected' ? 'destructive' : 'outline'} className="text-xs px-2">
                                          {settlement.status.replace(/_/g, ' ')}
                                        </Badge>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {expense.status === "pending" && !expense.isSoloExpense && (
                                <Button onClick={() => handleSettleUp(expense)} className="w-full mt-2 h-10" data-testid={`button-settle-${expense.id}`}>
                                  Mark Payment
                                  <ArrowRight className="h-4 w-4 ml-2" />
                                </Button>
                              )}
                              
                              {expense.isSoloExpense && expense.status === "pending" && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full mt-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLocation(`/expense/${expense.id}`);
                                  }}
                                  data-testid={`button-mark-paid-${expense.id}`}
                                >
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Mark as Paid
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </SwipeableCard>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floating Action Button for Add Expense - positioned in main content area */}
      <div className="fixed bottom-[110px] right-6 lg:bottom-12 lg:right-12 z-50">
        <Button
          onClick={() => setDialogOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-primary hover:bg-primary/90 active:scale-95 border-2 border-white/20 transition-all"
          size="icon"
          data-testid="button-add-expense-fab"
        >
          <Plus className="h-7 w-7 text-white" />
        </Button>
      </div>
    </>
  );
}
