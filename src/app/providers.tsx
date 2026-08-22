"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useAuthFromFirebase } from "@/lib/firebase/useAuthFromFirebase";

const url = process.env.NEXT_PUBLIC_CONVEX_URL;
const client = url ? new ConvexReactClient(url) : null;

export function convexConfigured(): boolean {
  return Boolean(url);
}

export function Providers({ children }: { children: ReactNode }) {
  if (!client) return children;
  return (
    <ConvexProviderWithAuth client={client} useAuth={useAuthFromFirebase}>
      {children}
    </ConvexProviderWithAuth>
  );
}
