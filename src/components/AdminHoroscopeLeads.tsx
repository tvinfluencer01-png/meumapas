import { Users } from "lucide-react";
import { LeadsBlock, useNewLeadsCount } from "@/components/AdminHoroscopeLanding";
import { useEffect } from "react";

export function AdminHoroscopeLeads() {
  const { markSeen } = useNewLeadsCount();

  useEffect(() => {
    markSeen();
  }, [markSeen]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Users className="size-5 text-gold" />
        <h2 className="text-lg font-semibold">Horóscopo Leads</h2>
      </div>
      <LeadsBlock />
    </div>
  );
}
