import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AffiliateShell } from "@/modules/affiliate/ui/AffiliateShell";
import { getMyAffiliate } from "@/modules/affiliate/affiliate.functions";
import {
  updateAccount, changePassword, createUploadUrl,
  getPaymentMethods, saveBankAccount, addPixKey, deletePixKey,
} from "@/modules/affiliate/panel.functions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Trash2, Upload, KeyRound, User, FileText, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

export const Route = createFileRoute("/affiliate/account")({
  component: Page,
  head: () => ({ meta: [{ title: "Minha Conta — Affiliate Center" }] }),
});

function Page() { return <AffiliateShell><Content /></AffiliateShell>; }

function Content() {
  const qc = useQueryClient();
  const meFn = useServerFn(getMyAffiliate);
  const upFn = useServerFn(updateAccount);
  const pwFn = useServerFn(changePassword);
  const uploadFn = useServerFn(createUploadUrl);
  const payFn = useServerFn(getPaymentMethods);
  const bankFn = useServerFn(saveBankAccount);
  const pixAddFn = useServerFn(addPixKey);
  const pixDelFn = useServerFn(deletePixKey);

  const { data: me } = useQuery({ queryKey: ["my-affiliate"], queryFn: () => meFn() });
  const { data: pay } = useQuery({ queryKey: ["aff-payments"], queryFn: () => payFn() });
  const p = (me as any)?.profile;

  const [fullName, setFullName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [newPass, setNewPass] = useState("");
  const avatarInput = useRef<HTMLInputElement>(null);
  const docInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!p) return;
    setFullName(p.full_name ?? "");
    setWhatsapp(p.whatsapp ?? "");
  }, [p]);

  const saveMut = useMutation({
    mutationFn: (patch: any) => upFn({ data: patch }),
    onSuccess: () => { toast.success("Perfil atualizado!"); qc.invalidateQueries({ queryKey: ["my-affiliate"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const pwMut = useMutation({
    mutationFn: () => pwFn({ data: { newPassword: newPass } as any }),
    onSuccess: () => { toast.success("Senha alterada!"); setNewPass(""); },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadFile = async (file: File, scope: "avatar" | "document") => {
    const res: any = await uploadFn({ data: { path: file.name, scope } });
    const put = await fetch(res.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!put.ok) throw new Error("Falha no upload");
    return res.publicUrl as string;
  };

  const onAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const url = await uploadFile(file, "avatar");
      saveMut.mutate({ avatar_url: url });
    } catch (err: any) { toast.error(err.message); }
  };
  const onDoc = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const url = await uploadFile(file, "document");
      saveMut.mutate({ document_url: url });
    } catch (err: any) { toast.error(err.message); }
  };

  // Bank state
  const [bank, setBank] = useState<any>({ bank_name: "", branch: "", account_number: "", account_type: "checking", holder_name: "", holder_doc: "" });
  useEffect(() => {
    if (pay?.bank) setBank(pay.bank);
  }, [pay?.bank]);
  const bankMut = useMutation({
    mutationFn: () => bankFn({ data: bank }),
    onSuccess: () => { toast.success("Conta bancária salva!"); qc.invalidateQueries({ queryKey: ["aff-payments"] }); },
    onError: (e: Error) => toast.error(e.message),
  });

  // PIX
  const [pixType, setPixType] = useState<"cpf" | "email" | "phone" | "random" | "cnpj">("email");
  const [pixValue, setPixValue] = useState("");
  const pixAddMut = useMutation({
    mutationFn: () => pixAddFn({ data: { key_type: pixType, key_value: pixValue } as any }),
    onSuccess: () => { setPixValue(""); qc.invalidateQueries({ queryKey: ["aff-payments"] }); toast.success("Chave PIX adicionada"); },
    onError: (e: Error) => toast.error(e.message),
  });
  const pixDelMut = useMutation({
    mutationFn: (id: string) => pixDelFn({ data: { id } as any }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["aff-payments"] }),
  });

  if (!p) return <div>Carregando…</div>;

  const initials = p.full_name?.split(" ").slice(0, 2).map((s: string) => s[0]).join("").toUpperCase() ?? "AF";

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-serif shimmer-text">Minha Conta</h1>
        <p className="text-sm text-muted-foreground">Perfil, documentos, dados bancários e segurança.</p>
      </header>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><User className="size-5" /> Perfil</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="size-20">
              {p.avatar_url && <AvatarImage src={p.avatar_url} />}
              <AvatarFallback className="bg-gold/20 text-gold text-xl">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <input ref={avatarInput} type="file" hidden accept="image/*" onChange={onAvatar} />
              <Button variant="outline" size="sm" onClick={() => avatarInput.current?.click()}>
                <Upload className="size-3 mr-1" /> Alterar foto
              </Button>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div><Label>Nome completo</Label><Input value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
            <div><Label>WhatsApp</Label><Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} /></div>
            <div><Label>E-mail</Label><Input value={p.email} disabled /></div>
            <div><Label>CPF</Label><Input value={p.cpf} disabled /></div>
          </div>
          <Button onClick={() => saveMut.mutate({ full_name: fullName, whatsapp })} disabled={saveMut.isPending}>Salvar</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-5" /> Documentos</CardTitle><CardDescription>Envie um documento de identificação.</CardDescription></CardHeader>
        <CardContent className="space-y-2">
          {p.document_url ? (
            <div className="flex items-center gap-2">
              <Badge>Documento enviado</Badge>
              <a href={p.document_url} target="_blank" rel="noreferrer" className="text-xs text-gold underline">Ver arquivo</a>
            </div>
          ) : <Badge variant="outline">Sem documento</Badge>}
          <input ref={docInput} type="file" hidden accept=".pdf,image/*" onChange={onDoc} />
          <div><Button variant="outline" size="sm" onClick={() => docInput.current?.click()}><Upload className="size-3 mr-1" /> Enviar documento</Button></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="size-5" /> Conta Bancária</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div><Label>Banco</Label><Input value={bank.bank_name} onChange={(e) => setBank({ ...bank, bank_name: e.target.value })} /></div>
            <div><Label>Agência</Label><Input value={bank.branch} onChange={(e) => setBank({ ...bank, branch: e.target.value })} /></div>
            <div><Label>Conta</Label><Input value={bank.account_number} onChange={(e) => setBank({ ...bank, account_number: e.target.value })} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={bank.account_type} onValueChange={(v) => setBank({ ...bank, account_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="checking">Corrente</SelectItem>
                  <SelectItem value="savings">Poupança</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>Titular</Label><Input value={bank.holder_name} onChange={(e) => setBank({ ...bank, holder_name: e.target.value })} /></div>
            <div><Label>Documento do titular</Label><Input value={bank.holder_doc} onChange={(e) => setBank({ ...bank, holder_doc: e.target.value })} /></div>
          </div>
          <Button onClick={() => bankMut.mutate()} disabled={bankMut.isPending}>Salvar conta</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Chaves PIX</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col md:flex-row gap-2">
            <Select value={pixType} onValueChange={(v) => setPixType(v as any)}>
              <SelectTrigger className="md:w-40"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cpf">CPF</SelectItem>
                <SelectItem value="cnpj">CNPJ</SelectItem>
                <SelectItem value="email">E-mail</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
                <SelectItem value="random">Aleatória</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Chave PIX" value={pixValue} onChange={(e) => setPixValue(e.target.value)} />
            <Button onClick={() => pixAddMut.mutate()} disabled={!pixValue || pixAddMut.isPending}>Adicionar</Button>
          </div>
          <div className="divide-y">
            {(pay?.pix ?? []).map((k: any) => (
              <div key={k.id} className="py-2 flex items-center justify-between text-sm">
                <div>
                  <Badge variant="outline" className="mr-2">{k.key_type}</Badge>
                  <span className="font-mono">{k.key_value}</span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => pixDelMut.mutate(k.id)}><Trash2 className="size-3" /></Button>
              </div>
            ))}
            {(pay?.pix ?? []).length === 0 && <div className="text-xs text-muted-foreground py-2">Nenhuma chave</div>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><KeyRound className="size-5" /> Trocar Senha</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Input type="password" placeholder="Nova senha (mín 8 caracteres)" value={newPass} onChange={(e) => setNewPass(e.target.value)} />
          <Button onClick={() => pwMut.mutate()} disabled={newPass.length < 8 || pwMut.isPending}>Alterar senha</Button>
        </CardContent>
      </Card>
    </div>
  );
}
