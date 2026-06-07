import type { ReactNode } from "react";

export function PageStack({ children }: { children: ReactNode }) {
  return <div className="page-stack">{children}</div>;
}
