import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Globe, Lock, Search, MapPin, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PublicTerritoryViewProps {
  territoryId: string;
  territoryName: string;
}

interface PublicProspect {
  id: string;
  name: string;
  website: string;
  industry: string;
  status: string;
  location_count: number | null;
  tier: string;
}

export function PublicTerritoryView({ territoryId, territoryName }: PublicTerritoryViewProps) {
  const navigate = useNavigate();
  const [prospects, setProspects] = useState<PublicProspect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("prospects")
        .select("id, name, website, industry, status, location_count, tier")
        .eq("territory_id", territoryId)
        .order("name");
      if (data) setProspects(data);
      setLoading(false);
    })();
  }, [territoryId]);

  const filtered = prospects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.industry.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="border-b border-border bg-muted/30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            You're viewing a shared territory (read-only)
          </span>
        </div>
        <Button size="sm" variant="outline" onClick={() => navigate("/auth")} className="gap-1.5">
          <Lock className="w-3.5 h-3.5" />
          Sign in to edit
        </Button>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">{territoryName}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {prospects.length} prospect{prospects.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospects..."
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-muted-foreground"
          />
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">No prospects found.</p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Locations</TableHead>
                  <TableHead>Tier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div>
                        <span className="font-medium text-foreground">{p.name}</span>
                        {p.website && (
                          <a
                            href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block text-xs text-primary hover:underline truncate max-w-[200px]"
                          >
                            {p.website}
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.industry ? (
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <Building2 className="w-3.5 h-3.5" />
                          {p.industry}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs">{p.status || "Prospect"}</Badge>
                    </TableCell>
                    <TableCell>
                      {p.location_count != null ? (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="w-3.5 h-3.5" />
                          {p.location_count}
                        </div>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {p.tier ? (
                        <Badge variant="secondary" className="text-xs">{p.tier}</Badge>
                      ) : (
                        <span className="text-muted-foreground/50">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
