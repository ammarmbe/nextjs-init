import { getSession } from "@/utils/auth";
import type { ReactNode } from "react";

export default async function Layout({ children }: { children: ReactNode }) {
  const { session } = await getSession();

  if (!session) {
    throw new Error("FORBIDDEN");
  }

  return children;
}
