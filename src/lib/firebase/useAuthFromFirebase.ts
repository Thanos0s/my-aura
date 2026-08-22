"use client";

import { onAuthStateChanged, type User } from "firebase/auth";
import { useEffect, useState } from "react";
import { getFirebaseAuth, isFirebaseConfigured } from "@/lib/firebase/client";

export function useAuthFromFirebase() {
  const enabled = isFirebaseConfigured();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }
    return onAuthStateChanged(getFirebaseAuth(), (next) => {
      setUser(next);
      setIsLoading(false);
    });
  }, [enabled]);

  return {
    isLoading,
    isAuthenticated: user != null,
    fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      if (!enabled) return null;
      const current = getFirebaseAuth().currentUser ?? user;
      if (!current) return null;
      return await current.getIdToken(forceRefreshToken);
    },
  };
}
