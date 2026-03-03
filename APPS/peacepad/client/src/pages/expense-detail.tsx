import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDate } from "@/lib/dateUtils";
import { SEOHead } from "@/components/SEOHead";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ArrowLeft, Download, Trash2, Edit2, DollarSign, Calendar, User, AlertTriangle, CheckCircle, Clock, Upload, Receipt, FileText, Image } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Expense } from "@shared/schema";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { validateAmount } from "@/lib/fieldValidation";
import { Progress } from "@/components/ui/progress";

interface EnrichedExpense extends Expense {
  userPercentage?: string;
  userOwedAmount?: string;
  userPaidAmount?: string;
  isSoloExpense?: boolean;
}

interface Settlement {
  id: string;
  amount: string;
  method: string;
  status: string;
  initiatedAt: Date;
  confirmedAt: Date | null;
}

export default function ExpenseDetailPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [settleDialogOpen, setSettleDialogOpen] = useState(false);
  const [settleAmount, setSettleAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("e_transfer");
  const [paymentLink, setPaymentLink] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [receiptPreview, setReceiptPreview] = useState<string | null>(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [uploadedReceiptUrl, setUploadedReceiptUrl] = useState<string | null>(null);

  // Get expense ID from URL - format: /expense/{id}
  const pathParts = window.location.pathname.split("/");
  const expenseId = pathParts[pathParts.length - 1];

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: expense, isLoading: expenseLoading } = useQuery<EnrichedExpense>({
    queryKey: ["/api/expenses", expenseId],
    queryFn: async () => {
      const response = await fetch(`/api/expenses?id=${expenseId}`, { credentials: "include" });
      if (!response.ok) throw new Error("Failed to load expense");
      const data = await response.json();
      return data.expenses?.[0] || null;
    },
    enabled: !!expenseId && !!user,
  });

  const { data: settlements = [] } = useQuery<Settlement[]>({
    queryKey: ["/api/expenses", expenseId, "settlements"],
    queryFn: async () => {
      const response = await fetch(`/api/expenses/${expenseId}/settlements`, { credentials: "include" });
      if (!response.ok) return [];
      return response.json();
    },
    enabled: !!expenseId && !!user,
  });

  const deleteExpense = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/expenses/${expenseId}`, {});
    },
    onSuccess: () => {
      toast({ title: "Expense deleted", description: "The expense has been removed." });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      setLocation("/expenses");
    },
  });

  const handleReceiptUpload = async (file: File) => {
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/receipt-upload", { method: "POST", body: formData, credentials: "include" });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setUploadedReceiptUrl(data.receiptUrl);
      toast({ title: "Receipt uploaded", description: "Your payment proof has been attached." });
    } catch (error) {
      toast({ title: "Upload failed", description: "Could not upload receipt. Try again.", variant: "destructive" });
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 5MB", variant: "destructive" });
      return;
    }
    setReceiptFile(file);
    setReceiptPreview(URL.createObjectURL(file));
    handleReceiptUpload(file);
  };

  const initiateSettlement = useMutation({
    mutationFn: async () => {
      if (!settleAmount || !expense) throw new Error("Amount required");
      await apiRequest("POST", `/api/settlements/initiate`, {
        expenseId: expense.id,
        amount: parseFloat(settleAmount),
        method: paymentMethod,
        paymentLink,
        note: paymentNote,
        receiptUrl: uploadedReceiptUrl,
        partnershipId: expense.partnershipId,
        receiverId: expense.createdBy === (user as any)?.id ? null : expense.createdBy,
      });
    },
    onSuccess: () => {
      toast({ title: "Payment logged", description: "Your co-parent will be notified about this payment." });
      setSettleDialogOpen(false);
      setSettleAmount("");
      setPaymentMethod("e_transfer");
      setPaymentLink("");
      setPaymentNote("");
      setReceiptFile(null);
      setReceiptPreview(null);
      setUploadedReceiptUrl(null);
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", expenseId, "settlements"] });
    },
  });

  if (expenseLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-8 bg-muted rounded w-32 animate-pulse" />
        <div className="space-y-2">
          <div className="h-24 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!expense) {
    return (
      <div className="p-4 text-center">
        <p className="text-muted-foreground">Expense not found</p>
        <Button onClick={() => setLocation("/expenses")} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Expenses
        </Button>
      </div>
    );
  }

  const userOwed = expense.userOwedAmount ? parseFloat(expense.userOwedAmount) : 0;
  const userPaid = expense.userPaidAmount ? parseFloat(expense.userPaidAmount) : 0;
  const remaining = Math.max(0, userOwed - userPaid);
  const userPercentage = expense.userPercentage ? parseInt(expense.userPercentage) : 50;
  const totalAmount = parseFloat(expense.amount);
  const isOwedByUser = userOwed > userPaid;

  return (
    <>
      <SEOHead title={`Expense: ${expense.description}`} description={`Details for expense: $${totalAmount}`} />
      
      <div className="p-4 space-y-4 pb-20">
        {/* Header */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setLocation("/expenses")} data-testid="button-back">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-2xl font-bold flex-1">Expense Details</h1>
        </div>

        {/* Main Card */}
        <Card className="bg-card/70 rounded-2xl shadow-sm border-border">
          <CardContent className="p-6 space-y-6">
            {/* Title & Amount */}
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">{expense.description}</h2>
              <p className="text-4xl font-bold text-primary">${totalAmount.toFixed(2)}</p>
              <div className="flex items-center gap-2 flex-wrap pt-2">
                <Badge variant="secondary" className="capitalize">{expense.category}</Badge>
                <Badge variant="outline">{formatDate.full(expense.createdAt)}</Badge>
              </div>
            </div>

            {/* Status Section */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Your Share</p>
                <p className="text-lg font-semibold text-foreground">${userOwed.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">{userPercentage}%</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Status</p>
                {remaining > 0 ? (
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                    <Clock className="w-4 h-4" />
                    <span className="font-semibold">${remaining.toFixed(2)} pending</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                    <CheckCircle className="w-4 h-4" />
                    <span className="font-semibold">Settled</span>
                  </div>
                )}
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <DollarSign className="w-3 h-3" /> Amount Paid
                </p>
                <p className="font-semibold text-foreground">${userPaid.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> Created
                </p>
                <p className="font-semibold text-foreground">{formatDate.short(expense.createdAt)}</p>
              </div>
            </div>

            {/* Split Breakdown - only show for partnership expenses */}
            {!expense.isSoloExpense && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Payment Split</p>
                <div className="flex items-center gap-2 h-8 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary flex items-center justify-center text-xs font-semibold text-primary-foreground transition-all"
                    style={{ width: `${userPercentage}%` }}
                  >
                    {userPercentage > 20 && `${userPercentage}%`}
                  </div>
                  <div
                    className="h-full bg-secondary flex items-center justify-center text-xs font-semibold text-secondary-foreground transition-all flex-1"
                  >
                    {100 - userPercentage > 20 && `${100 - userPercentage}%`}
                  </div>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>You</span>
                  <span>Partner</span>
                </div>
              </div>
            )}

            {/* Receipt Section */}
            {expense.receiptUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Download className="w-4 h-4" /> Receipt
                </p>
                <a
                  href={expense.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 border border-border rounded-lg bg-card hover-elevate text-center text-sm font-medium text-primary"
                  data-testid="link-receipt"
                >
                  View Receipt
                </a>
              </div>
            )}

            {/* Payment Progress */}
            {userOwed > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-medium">Payment Progress</p>
                  <span className="text-sm font-semibold text-primary">
                    {Math.round((userPaid / userOwed) * 100)}%
                  </span>
                </div>
                <Progress value={(userPaid / userOwed) * 100} className="h-2" />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>${userPaid.toFixed(2)} paid</span>
                  <span>${remaining.toFixed(2)} remaining</span>
                </div>
              </div>
            )}

            {/* Payment History */}
            {settlements.length > 0 && (
              <div className="space-y-3">
                <p className="text-sm font-medium flex items-center gap-1">
                  <Receipt className="w-4 h-4" /> Payment History
                </p>
                <div className="space-y-2">
                  {settlements.map((settlement) => (
                    <div
                      key={settlement.id}
                      className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg"
                      data-testid={`payment-${settlement.id}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        settlement.status === 'confirmed' ? 'bg-green-500' :
                        settlement.status === 'pending' || settlement.status === 'pending_confirmation' ? 'bg-amber-500' : 
                        settlement.status === 'disputed' ? 'bg-red-500' : 'bg-amber-500'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">${parseFloat(settlement.amount).toFixed(2)}</span>
                          <Badge variant="secondary" className="text-xs">
                            {settlement.status === 'confirmed' ? 'Confirmed' :
                             settlement.status === 'pending_confirmation' ? 'Pending' :
                             settlement.status === 'pending' ? 'Pending' :
                             settlement.status === 'disputed' ? 'Disputed' :
                             settlement.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground capitalize">{settlement.method.replace('_', ' ')}</p>
                        <p className="text-xs text-muted-foreground">{formatDate.short(settlement.initiatedAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons - only show for partnership expenses that have remaining amount */}
        {remaining > 0 && isOwedByUser && !expense.isSoloExpense && (
          <Button
            onClick={() => {
              setSettleAmount(remaining.toString());
              setSettleDialogOpen(true);
            }}
            className="w-full h-12 text-base"
            data-testid="button-settle"
          >
            <DollarSign className="w-4 h-4 mr-2" />
            Settle Payment (${remaining.toFixed(2)})
          </Button>
        )}
        
        {expense.isSoloExpense && expense.status === "pending" && (
          <Button
            onClick={() => {
              setSettleAmount(parseFloat(expense.amount).toString());
              setPaymentMethod("mark_paid");
              setSettleDialogOpen(true);
            }}
            className="w-full h-12 text-base"
            data-testid="button-mark-paid"
          >
            <CheckCircle className="w-4 h-4 mr-2" />
            Mark as Paid
          </Button>
        )}
        
        {expense.isSoloExpense && expense.status === "settled" && (
          <div className="text-center text-sm text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/30 rounded-lg p-4 flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4" />
            Paid
          </div>
        )}

        {/* Edit & Delete */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setLocation(`/expenses?edit=${expense.id}`)}
            data-testid="button-edit-expense"
          >
            <Edit2 className="w-4 h-4 mr-2" />
            Edit
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-destructive hover:text-destructive"
            onClick={() => {
              if (confirm("Delete this expense? This cannot be undone.")) {
                deleteExpense.mutate();
              }
            }}
            disabled={deleteExpense.isPending}
            data-testid="button-delete-expense"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {/* Settlement Dialog */}
      <Dialog open={settleDialogOpen} onOpenChange={(open) => {
        setSettleDialogOpen(open);
        if (!open) {
          setPaymentNote("");
          setReceiptFile(null);
          setReceiptPreview(null);
          setUploadedReceiptUrl(null);
        }
      }}>
        <DialogContent className="max-h-[80dvh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle>Log Payment</DialogTitle>
            <DialogDescription>Record your payment details so your co-parent can confirm receipt</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4 flex-1 overflow-y-auto pr-1">
            <div>
              <Label>Amount Paid</Label>
              <Input
                type="number"
                step="0.01"
                value={settleAmount}
                onChange={(e) => setSettleAmount(e.target.value)}
                placeholder="0.00"
                data-testid="input-settlement-amount"
              />
            </div>
            <div>
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger data-testid="select-payment-method">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mark_paid">Mark as Paid</SelectItem>
                  <SelectItem value="e_transfer">E-Transfer</SelectItem>
                  <SelectItem value="paypal">PayPal</SelectItem>
                  <SelectItem value="venmo">Venmo</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>Reference / Notes</Label>
              <Textarea
                value={paymentNote}
                onChange={(e) => setPaymentNote(e.target.value)}
                placeholder="e.g., E-transfer confirmation: ABC123"
                className="resize-none"
                rows={2}
                data-testid="input-payment-note"
              />
              <p className="text-xs text-muted-foreground mt-1">Add confirmation code or notes about this payment</p>
            </div>

            <div>
              <Label>Payment Proof (Optional)</Label>
              <div className="mt-2">
                {receiptPreview ? (
                  <div className="relative rounded-lg border overflow-hidden">
                    <img src={receiptPreview} alt="Receipt preview" className="w-full max-h-48 object-contain bg-muted" />
                    <div className="absolute top-2 right-2 flex gap-1">
                      {uploadingReceipt && (
                        <Badge variant="secondary" className="text-xs">Uploading...</Badge>
                      )}
                      {uploadedReceiptUrl && (
                        <Badge variant="secondary" className="text-xs bg-green-500/20 text-green-700 dark:text-green-400">
                          <CheckCircle className="w-3 h-3 mr-1" />Uploaded
                        </Badge>
                      )}
                      <Button
                        size="icon"
                        variant="secondary"
                        className="h-6 w-6"
                        onClick={() => {
                          setReceiptFile(null);
                          setReceiptPreview(null);
                          setUploadedReceiptUrl(null);
                        }}
                        data-testid="button-remove-receipt"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <label htmlFor="payment-receipt-upload" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover-elevate transition-colors">
                      <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Upload screenshot or receipt</p>
                      <p className="text-xs text-muted-foreground mt-1">e-transfer confirmation, bank receipt, etc.</p>
                    </div>
                    <input
                      id="payment-receipt-upload"
                      type="file"
                      accept="image/*,.pdf"
                      onChange={handleFileSelect}
                      className="hidden"
                      data-testid="input-payment-receipt"
                    />
                  </label>
                )}
              </div>
            </div>

            {paymentMethod !== "mark_paid" && paymentMethod !== "cash" && (
              <div>
                <Label>Payment Link (Optional)</Label>
                <Input
                  value={paymentLink}
                  onChange={(e) => setPaymentLink(e.target.value)}
                  placeholder="https://..."
                  data-testid="input-payment-link"
                />
              </div>
            )}
          </div>
          <div className="flex-shrink-0 pt-4 border-t mt-4">
            <Button
              onClick={() => initiateSettlement.mutate()}
              disabled={initiateSettlement.isPending || uploadingReceipt || !settleAmount}
              className="w-full"
              data-testid="button-confirm-settlement"
            >
              {initiateSettlement.isPending ? "Logging Payment..." : "Log Payment"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
