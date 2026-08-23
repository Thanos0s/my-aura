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
      return undefined;
    }
    try {
      const auth = getFirebaseAuth();
      return onAuthStateChanged(
        auth,
        (next) => {
          setIsAuthenticated(next != null);
          setIsLoading(false);
        },
        (error) => {
          console.warn("Firebase onAuthStateChanged error:", error);
          setIsLoading(false);
          setIsAuthenticated(false);
        }
      );
    } catch (err) {
      console.warn("Failed to initialize Firebase Auth listener:", err);
      setIsLoading(false);
      setIsAuthenticated(false);
      return undefined;
    }
  }, [enabled]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!isFirebaseConfigured()) return null;
      try {
        const auth = getFirebaseAuth();
        const current = auth.currentUser;
        if (!current) return null;
        return await current.getIdToken(forceRefreshToken);
      } catch (err) {
        console.warn("Failed to fetch Firebase token:", err);
        return null;
      }
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
