'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserManually } from '@/lib/api/users';
import { getSectors } from '@/lib/api/sectors';
import type { Sector } from '@/types/sector.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { UserPlus, ArrowLeft } from 'lucide-react';

export default function NewUserPage() {
  const router = useRouter();
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    name: '',
    email: '',
    cpf: '',
    phone: '',
    position: '',
    sector: '',
    is_staff: false,
    is_superuser: false,
    is_active: true,
  });

  useEffect(() => {
    getSectors({ page_size: 200 })
      .then((res) => setSectors((res as any).results || res as any))
      .catch(() => {});
  }, []);

  const set = (field: string, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createUserManually({
        email: form.email,
        name: form.name,
        cpf: form.cpf,
        phone: form.phone,
        position: form.position,
        sector: form.sector ? Number(form.sector) : null,
        is_staff: form.is_staff,
        is_superuser: form.is_superuser,
        is_active: form.is_active,
      });
      toast({
        title: 'Usuário criado!',
        description: `Credenciais temporárias foram enviadas para ${form.email}.`,
      });
      router.push('/usuarios');
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao criar usuário', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-2xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Cadastrar Usuário</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Cria o cadastro completo e envia uma senha temporária por e-mail.
          </p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Dados do usuário</CardTitle>
              <CardDescription className="text-xs">
                Uma senha temporária será gerada e enviada ao e-mail informado.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Name + Email */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome completo *</Label>
                <Input id="name" required value={form.name}
                  onChange={(e) => set('name', e.target.value)} placeholder="Nome Sobrenome" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" required value={form.email}
                  onChange={(e) => set('email', e.target.value)} placeholder="email@empresa.com" />
              </div>
            </div>

            {/* CPF + Phone */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input id="cpf" value={form.cpf}
                  onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input id="phone" value={form.phone}
                  onChange={(e) => set('phone', e.target.value)} placeholder="(00) 00000-0000" />
              </div>
            </div>

            {/* Position + Sector */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="position">Cargo</Label>
                <Input id="position" value={form.position}
                  onChange={(e) => set('position', e.target.value)} placeholder="Ex: Analista" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sector">Setor</Label>
                <select id="sector" value={form.sector}
                  onChange={(e) => set('sector', e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <option value="">Selecione</option>
                  {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>

            {/* Permissions */}
            <div className="rounded-lg border border-border/60 p-4 space-y-3">
              <p className="text-sm font-medium">Permissões</p>
              <div className="flex flex-wrap gap-4">
                {[
                  { field: 'is_active', label: 'Conta ativa' },
                  { field: 'is_staff', label: 'Acesso ao admin' },
                  { field: 'is_superuser', label: 'Superusuário' },
                ].map(({ field, label }) => (
                  <label key={field} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input type="checkbox"
                      checked={form[field as keyof typeof form] as boolean}
                      onChange={(e) => set(field, e.target.checked)}
                      className="rounded" />
                    {label}
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancelar</Button>
              <Button type="submit" disabled={loading} className="gap-2">
                {loading ? 'Criando...' : <><UserPlus className="h-4 w-4" /> Criar usuário</>}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
