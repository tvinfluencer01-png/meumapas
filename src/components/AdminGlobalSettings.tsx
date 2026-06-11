import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Save, Phone, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getSystemGlobalSettings, saveSystemGlobalSettings } from "@/lib/admin.functions";

export function AdminGlobalSettings() {
  const qc = useQueryClient();
  const getSettingsFn = useServerFn(getSystemGlobalSettings);
  const saveSettingsFn = useServerFn(saveSystemGlobalSettings);
  
  const [whatsapp, setWhatsapp] = useState("");
  
  const { data, isLoading } = useQuery({
    queryKey: ["admin-global-settings"],
    queryFn: () => getSettingsFn(),
  });

  useEffect(() => {
    if (data) {
      setWhatsapp(data.whatsapp_number || "");
    }
  }, [data]);

  const saveMut = useMutation({
    mutationFn: (vars: { whatsapp_number: string }) => saveSettingsFn({ data: vars }),
    onSuccess: () => {
      toast.success("Configurações globais salvas.");
      qc.invalidateQueries({ queryKey: ["admin-global-settings"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Phone className="size-5 text-gold" /> Configurações da Landing Page
        </CardTitle>
        <CardDescription>
          Configure informações globais exibidas para visitantes.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground text-sm py-4">
            <Loader2 className="size-4 animate-spin" /> Carregando configurações...
          </div>
        ) : (
          <div className="space-y-4 max-w-md">
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp de Contato (Botão flutuante)</Label>
              <div className="flex gap-2">
                <Input
                  id="whatsapp"
                  placeholder="Ex: 5511999999999"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, ""))}
                  maxLength={20}
                />
                <Button 
                  onClick={() => saveMut.mutate({ whatsapp_number: whatsapp })}
                  disabled={saveMut.isPending}
                  className="bg-gold text-primary-foreground hover:bg-gold-glow shrink-0"
                >
                  {saveMut.isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4 mr-2" />}
                  Salvar
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Insira apenas números com código do país (DDI) e área (DDD).
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
