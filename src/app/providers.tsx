"use client";

import { ConvexProviderWithAuth, ConvexReactClient } from "convex/react";
import type { ReactNode } from "react";
import { useAuthFromFirebase } from "@/lib/firebase/useAuthFromFirebase";

const CLOUD_CONVEX_URL = "https://confident-caterpillar-849.convex.cloud";

function getConvexUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  // If envUrl is missing or points to localhost/127.0.0.1 which Brave browser blocks, use the HTTPS cloud deployment
  if (!envUrl || envUrl.includes("127.0.0.1") || envUrl.includes("localhost")) {
    return CLOUD_CONVEX_URL;
  }
  return envUrl;
}

const url = getConvexUrl();
const client = new ConvexReactClient(url);

export function convexConfigured(): boolean {
  return Boolean(url);
}

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ConvexProviderWithAuth client={client} useAuth={useAuthFromFirebase}>
      {children}
    </ConvexProviderWithAuth>
  );
}

