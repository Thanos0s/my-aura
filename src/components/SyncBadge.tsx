"use client";

import { useConvex } from "convex/react";
import { useEffect, useState } from "react";
import { convexConfigured } from "@/app/providers";

export function useConvexConnected(): boolean {
  const convex = useConvex();
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    const sync = () => setConnected(convex.connectionState().isWebSocketConnected);
    sync();
    return convex.subscribeToConnectionState(sync);
  }, [convex]);
  return connected;
}

export function SyncBadge() {
  if (!convexConfigured()) {
    return <span className="tl-tag">Convex URL missing</span>;
  }
  return <SyncBadgeLive />;
}

function SyncBadgeLive() {
  const connected = useConvexConnected();
  return (
    <span className={`tl-tag ${connected ? "status-live border-pulse text-pulse" : "border-warning text-warning"}`}>
      {connected ? "Live sync" : "Convex offline"}
    </span>
  );
}
