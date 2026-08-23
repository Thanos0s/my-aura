"use client";

import { useConvex } from "convex/react";
import { useEffect, useState } from "react";
import { convexConfigured } from "@/app/providers";

export function useConvexConnected(): { isConnected: boolean; isConnecting: boolean } {
  const convex = useConvex();
  const [state, setState] = useState({ isConnected: true, isConnecting: false });

  useEffect(() => {
    const sync = () => {
      const conn = convex.connectionState();
      setState({
        isConnected: conn.isWebSocketConnected,
        isConnecting: !conn.isWebSocketConnected && !conn.hasEverConnected,
      });
    };
    sync();
    return convex.subscribeToConnectionState(sync);
  }, [convex]);

  return state;
}

export function SyncBadge() {
  if (!convexConfigured()) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
        Connecting…
      </span>
    );
  }
  return <SyncBadgeLive />;
}

function SyncBadgeLive() {
  const { isConnected, isConnecting } = useConvexConnected();

  if (isConnecting) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 px-2.5 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500 animate-pulse" />
        Connecting…
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold transition-all border ${
        isConnected
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-rose-50 text-rose-700 border-rose-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isConnected ? "bg-emerald-500 shadow-[0_0_6px_#10b981]" : "bg-rose-500"
        }`}
      />
      {isConnected ? "Live sync" : "Convex reconnecting"}
    </span>
  );
}

