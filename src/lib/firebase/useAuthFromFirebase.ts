"use client";

import { onAuthStateChanged } from "firebase/auth";
import { useCallback, useEffect, useMemo, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export function useAuthFromFirebase() {
  const enabled = isFirebaseConfigured();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      setIsAuthenticated(false);
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setIsAuthenticated(next != null);
      setIsLoading(false);
    });
  }, [enabled]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!isFirebaseConfigured()) return null;
      const current = getFirebaseAuth().currentUser;
      if (!current) return null;
      return await current.getIdToken(forceRefreshToken);
    },
    []
  );

  return useMemo(
    () => ({
      isLoading,
      isAuthenticated,
      fetchAccessToken,
    }),
    [isLoading, isAuthenticated, fetchAccessToken]
  );
}
