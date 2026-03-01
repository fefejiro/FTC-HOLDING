import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface ExpensesHeaderProps {
  balance: string;
  status: "positive" | "owing" | "owed";
}

export function ExpensesHeader({ balance, status }: ExpensesHeaderProps) {
  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/user"] });

  const statusConfig = {
    positive: { label: "Settled up", color: "text-[#7CFFB7]" },
    owing: { label: "You owe", color: "text-[#FFB366]" },
    owed: { label: "Owing you", color: "text-[#7CFFB7]" },
  };

  const config = statusConfig[status];

  return (
    <div
      className="relative w-full px-4 pt-4 pb-6 rounded-b-3xl overflow-hidden bg-primary"
      style={{
        minHeight: "140px",
      }}
    >
      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }} />

      <div className="relative flex flex-col justify-center h-full">
        {/* Balance info */}
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold text-primary-foreground uppercase tracking-wider opacity-80">Partnership Balance</p>
          <p className="text-4xl font-black text-primary-foreground mt-1 leading-none">{balance}</p>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`w-2 h-2 rounded-full ${status === "positive" || status === "owed" ? "bg-primary-foreground/70" : "bg-accent"}`}
            />
            <span className="text-sm font-medium text-primary-foreground">{config.label}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
