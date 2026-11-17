'use client';

import { useEffect, useState } from 'react';
import AdminGuard from '@/components/auth/AdminGuard';
import { getIssuingCompany, saveIssuingCompany, type IssuingCompany } from '@/lib/api/certificate-company';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Building2, Loader2, Save, Award } from 'lucide-react';

const empty: IssuingCompany = {name:'', cnpj:'', signatory_name:'', signatory_role:'', certificate_text:''};

function CompanyForm() {
  const [company, setCompany] = useState<IssuingCompany>(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [configured, setConfigured] = useState(false);
  const [loadError, setLoadError] = useState('');
  useEffect(() => {
    getIssuingCompany().then(data => {if (data) {setCompany(data); setConfigured(true);}})
      .catch(error => setLoadError(error.message)).finally(() => setLoading(false));
  }, []);
  const set = (field: keyof IssuingCompany, value: string) => setCompany(previous => ({...previous, [field]:value}));
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    try {
      const saved = await saveIssuingCompany({...company, name:company.name.trim()});
      setCompany(saved); setConfigured(true);
      toast({title:'Empresa emissora salva', description:'O cadastro será usado no texto e na assinatura dos novos certificados.'});
    } catch (error) {
      toast({title:'Não foi possível salvar', description:error instanceof Error ? error.message : 'Tente novamente.', variant:'destructive'});
    } finally {setSaving(false);}
  }
  if (loading) return <p role="status" className="flex gap-2 items-center"><Loader2 className="size-4 animate-spin"/>Carregando empresa...</p>;
  if (loadError) return <p role="alert" className="text-destructive">{loadError}</p>;
  return <div className="max-w-5xl space-y-6">
    <div><h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="size-6"/>Empresa emissora</h1>
      <p className="text-sm text-muted-foreground mt-2">Cadastre a empresa responsável por todos os certificados do InstructAI.</p></div>
    {!configured && <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm">Cadastre a empresa para liberar a emissão de certificados.</p>}
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr] items-start">
      <form onSubmit={submit} className="rounded-xl border bg-card p-5 space-y-5">
        <div className="space-y-2"><Label htmlFor="company-name">Nome ou razão social *</Label><Input id="company-name" required maxLength={200} value={company.name} onChange={e=>set('name',e.target.value)} placeholder="Nome da empresa emissora"/></div>
        <div className="space-y-2"><Label htmlFor="company-cnpj">CNPJ (opcional)</Label><Input id="company-cnpj" maxLength={18} value={company.cnpj} onChange={e=>set('cnpj',e.target.value)} placeholder="00.000.000/0000-00"/></div>
        <div className="space-y-2"><Label htmlFor="company-signatory">Responsável pela assinatura (opcional)</Label><Input id="company-signatory" maxLength={150} value={company.signatory_name} onChange={e=>set('signatory_name',e.target.value)}/></div>
        <div className="space-y-2"><Label htmlFor="company-role">Cargo do responsável (opcional)</Label><Input id="company-role" maxLength={100} value={company.signatory_role} onChange={e=>set('signatory_role',e.target.value)}/></div>
        <div className="space-y-2"><Label htmlFor="company-text">Texto adicional no certificado (opcional)</Label><Textarea id="company-text" maxLength={500} rows={4} value={company.certificate_text} onChange={e=>set('certificate_text',e.target.value)} placeholder="Informações complementares que devem aparecer no certificado"/><p className="text-xs text-muted-foreground">{company.certificate_text.length}/500 caracteres</p></div>
        <Button type="submit" disabled={saving || !company.name.trim()} className="gap-2">{saving?<Loader2 className="size-4 animate-spin"/>:<Save className="size-4"/>}{saving?'Salvando...':'Salvar empresa'}</Button>
      </form>
      <section className="rounded-xl border bg-card p-6 text-center space-y-5" aria-label="Prévia da assinatura">
        <Award className="size-8 text-primary mx-auto"/><h2 className="font-semibold">No certificado</h2>
        <p className="text-sm break-words">{company.name || 'A empresa cadastrada'} certifica que</p>
        <p className="font-semibold text-primary">Nome do participante</p><p className="text-sm text-muted-foreground">concluiu com êxito o curso</p>
        {company.certificate_text && <p className="text-xs text-muted-foreground whitespace-pre-wrap break-words">{company.certificate_text}</p>}
        <div className="pt-7"><p className="italic text-sm break-words min-h-5">{company.signatory_name}</p><div className="border-t mt-2 pt-3"><p className="font-medium break-words">{company.name || 'Nome da empresa'}</p><p className="text-xs text-muted-foreground mt-1">{company.signatory_role || 'Empresa emissora'}</p>{company.cnpj && <p className="text-xs text-muted-foreground mt-1">CNPJ: {company.cnpj}</p>}</div></div>
      </section>
    </div>
  </div>;
}
export default function CompanyPage() {return <AdminGuard><CompanyForm/></AdminGuard>;}
