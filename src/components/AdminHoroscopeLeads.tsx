import { Users } from "lucide-react";
import { Suspense, lazy, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { markHoroscopeLeadsSeen } from "@/components/AdminHoroscopeLanding";

const LeadsBlockLazy = lazy(() =>
  import("@/components/AdminHoroscopeLanding").then((m) => ({ default: m.LeadsBlock })),
);

function LeadsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-5 w-48 rounded bg-muted/60 animate-pulse" />
        <div className="mt-2 h-3 w-32 rounded bg-muted/40 animate-pulse" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="h-9 w-72 rounded-md bg-muted/50 animate-pulse" />
          <div className="h-9 w-32 rounded-md bg-muted/50 animate-pulse" />
        </div>
        <div className="rounded-md border border-border overflow-hidden">
          <div className="h-9 bg-secondary/40" />
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-3 border-t border-border px-3 py-3">
              {Array.from({ length: 7 }).map((_, j) => (
                <div
                  key={j}
                  className="h-3 rounded bg-muted/60 animate-pulse"
                  style={{ width: `${8 + ((i + j) * 5) % 15}%` }}
                />
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export function AdminHoroscopeLeads() {
  useEffect(() => {
    markHoroscopeLeadsSeen();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-gold" />
        <h2 className="text-lg font-semibold">Horóscopo Leads</h2>
      </div>
      <Suspense fallback={<LeadsSkeleton />}>
        <LeadsBlockLazy />
      </Suspense>
    </div>
  );
}
