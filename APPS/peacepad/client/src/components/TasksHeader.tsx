import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

interface TasksHeaderProps {
  totalTasks: number;
  incompleteTasks: number;
}

export function TasksHeader({ totalTasks, incompleteTasks }: TasksHeaderProps) {
  const { data: user } = useQuery<User>({ queryKey: ["/api/auth/user"] });

  const completionPercentage = totalTasks > 0 
    ? Math.round(((totalTasks - incompleteTasks) / totalTasks) * 100) 
    : 100;

  return (
    <div
      className="relative w-full px-4 pt-4 pb-6 rounded-b-3xl overflow-hidden bg-primary"
      style={{
        minHeight: "140px",
      }}
    >
      <div className="absolute inset-0 opacity-10" style={{ backgroundColor: "rgba(0, 0, 0, 0.1)" }} />

      <div className="relative flex flex-col justify-center h-full">
        <div className="flex flex-col justify-center">
          <p className="text-xs font-semibold text-primary-foreground uppercase tracking-wider opacity-80">Shared Productivity</p>
          <p className="text-4xl font-black text-primary-foreground mt-1 leading-none">
            {incompleteTasks} Tasks
          </p>
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`w-2 h-2 rounded-full ${completionPercentage === 100 ? "bg-[#7CFFB7]" : "bg-[#FFB366]"}`}
            />
            <span className="text-sm font-medium text-primary-foreground">
              {completionPercentage === 100 ? "All caught up" : `${completionPercentage}% complete`}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
