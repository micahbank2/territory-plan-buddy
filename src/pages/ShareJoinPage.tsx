import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PublicTerritoryView } from "@/components/PublicTerritoryView";

export default function ShareJoinPage() {
  const { territoryId } = useParams<{ territoryId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [status, setStatus] = useState<"loading" | "done" | "error" | "public">("loading");
  const [territoryName, setTerritoryName] = useState("");

  useEffect(() => {
    if (authLoading) return;

    // If user is logged in, try to join
    if (user && territoryId) {
      const role = searchParams.get("role") === "editor" ? "editor" : "viewer";

      (async () => {
        const { data: existing } = await supabase
          .from("territory_members")
          .select("id")
          .eq("territory_id", territoryId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (existing) {
          localStorage.setItem("tp-active-territory", territoryId);
          toast.info("You're already a member of this territory");
          navigate("/", { replace: true });
          return;
        }

        const { error } = await supabase.from("territory_members").insert({
          territory_id: territoryId,
          user_id: user.id,
          role,
        });

        if (error) {
          console.error("Join error:", error);
          toast.error("Failed to join territory");
          setStatus("error");
          return;
        }

        localStorage.setItem("tp-active-territory", territoryId);
        toast.success(`Joined territory as ${role}`);
        navigate("/", { replace: true });
      })();
      return;
    }

    // Not logged in — check if territory is public
    if (!user && territoryId) {
      (async () => {
        const { data: territory } = await supabase
          .from("territories")
          .select("id, name, public_access")
          .eq("id", territoryId)
          .maybeSingle();

        if (territory && (territory as any).public_access !== "none") {
          setTerritoryName(territory.name);
          setStatus("public");
        } else {
          // Not public — redirect to auth
          sessionStorage.setItem("tp-share-redirect", window.location.pathname + window.location.search);
          navigate("/auth", { replace: true });
        }
      })();
    }
  }, [user, authLoading, territoryId, searchParams, navigate]);

  if (status === "public" && territoryId) {
    return <PublicTerritoryView territoryId={territoryId} territoryName={territoryName} />;
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center space-y-3">
        {status === "loading" && (
          <>
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto" />
            <p className="text-sm text-muted-foreground">Joining territory...</p>
          </>
        )}
        {status === "error" && (
          <>
            <p className="text-sm text-destructive">Failed to join territory.</p>
            <button onClick={() => navigate("/")} className="text-sm text-primary underline">
              Go home
            </button>
          </>
        )}
      </div>
    </div>
  );
}
