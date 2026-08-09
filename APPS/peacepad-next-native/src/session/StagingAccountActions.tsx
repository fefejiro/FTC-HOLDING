import React, { createContext, useContext, type ReactNode } from "react";

export type StagingAccountActionsValue = Readonly<{
  deleteAccount: () => Promise<void>;
  deleting: boolean;
  error?: string;
}>;

const StagingAccountActionsContext = createContext<StagingAccountActionsValue | undefined>(undefined);

export function StagingAccountActionsProvider({
  children,
  value
}: {
  children: ReactNode;
  value: StagingAccountActionsValue;
}) {
  return <StagingAccountActionsContext.Provider value={value}>{children}</StagingAccountActionsContext.Provider>;
}

export function useOptionalStagingAccountActions(): StagingAccountActionsValue | undefined {
  return useContext(StagingAccountActionsContext);
}
