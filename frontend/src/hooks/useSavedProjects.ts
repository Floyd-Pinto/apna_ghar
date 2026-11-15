import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "@/services/api";
import { useAuth } from "@/contexts/AuthContext";

/** Tracks which projects the signed-in user has saved, with optimistic toggling. */
export function useSavedProjects() {
  const { isAuthenticated } = useAuth();
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isAuthenticated) {
      setSavedIds(new Set());
      return;
    }
    let cancelled = false;
    apiRequest("/api/projects/user/projects/saved_projects/")
      .then((res) => (res.ok ? res.json() : []))
      .then((data: { id: string }[]) => {
        if (!cancelled && Array.isArray(data)) setSavedIds(new Set(data.map((p) => String(p.id))));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  const toggleSaved = useCallback(
    async (projectId: string) => {
      const wasSaved = savedIds.has(projectId);
      const update = (save: boolean) =>
        setSavedIds((prev) => {
          const next = new Set(prev);
          if (save) next.add(projectId);
          else next.delete(projectId);
          return next;
        });

      update(!wasSaved);
      try {
        const res = await apiRequest(
          `/api/projects/user/projects/${wasSaved ? "unsave" : "save"}/${projectId}/`,
          { method: "POST" },
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
      } catch {
        update(wasSaved); // roll back
        throw new Error("Could not update saved projects");
      }
    },
    [savedIds],
  );

  return { savedIds, toggleSaved, canSave: isAuthenticated };
}
