'use client';

import AdminGuard from '@/components/auth/AdminGuard';
import { useEffect, useState, useCallback } from 'react';
import {
  getUsers, deleteUser, createUserManually, createInvitation,
  getInvitations, resendInvitation, cancelInvitation,
} from '@/lib/api/users';
import { getSectors } from '@/lib/api/sectors';
import type { UserAdmin, UserInvitation } from '@/types/user.types';
import type { Sector } from '@/types/sector.types';
import { useAuthContext } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';

import { SectorMultiSelect } from '@/components/manual/SectorMultiSelect';
import {
  Users, UserPlus, Mail, Search, Trash2, Shield, ShieldCheck,
  RefreshCw, X, Clock, CheckCircle2, AlertCircle, Ban, Send,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

const fmtDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });

const fmtDateTime = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', used: 'Utilizado', expired: 'Expirado', cancelled: 'Cancelado',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'default', used: 'secondary', expired: 'outline', cancelled: 'destructive',
};

// ─── Invite dialog ───────────────────────────────────────────────────────────

function InviteDialog({ open, onClose, onSuccess }: { open: boolean; onClose: () => void; onSuccess: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createInvitation(email);
      toast({ title: 'Convite enviado!', description: `E-mail enviado para ${email}.` });
      setEmail('');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Convidar por e-mail</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          O usuário receberá um link para criar a própria conta. O convite expira em 8 horas.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-1.5">
            <Label htmlFor="inv-email">E-mail</Label>
            <Input
              id="inv-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colaborador@empresa.com"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? 'Enviando...' : <><Send className="h-4 w-4" /> Enviar convite</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── New user dialog ─────────────────────────────────────────────────────────

const EMPTY_FORM = {
  name: '', email: '', cpf: '', phone: '', position: '', sector: '',
  is_staff: false, is_superuser: false, is_active: true,
};

function NewUserDialog({
  open, onClose, onSuccess, sectors,
}: {
  open: boolean; onClose: () => void; onSuccess: () => void; sectors: Sector[];
}) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string | boolean) => setForm((p) => ({ ...p, [k]: v }));

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
      toast({ title: 'Usuário criado!', description: `Credenciais enviadas para ${form.email}.` });
      setForm(EMPTY_FORM);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cadastrar usuário</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-1">
          Uma senha temporária será gerada e enviada ao e-mail informado.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Nome completo *</Label>
              <Input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Nome Sobrenome" />
            </div>
            <div className="space-y-1.5">
              <Label>E-mail *</Label>
              <Input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="email@empresa.com" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>CPF</Label>
              <Input value={form.cpf} onChange={(e) => set('cpf', e.target.value)} placeholder="000.000.000-00" />
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="(00) 00000-0000" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Cargo</Label>
              <Input value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="Ex: Analista" />
            </div>
            <div className="space-y-1.5">
              <Label>Setor</Label>
              <select
                value={form.sector}
                onChange={(e) => set('sector', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">Selecione</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
          <div className="flex gap-5 pt-1">
            {([
              { k: 'is_active', label: 'Conta ativa' },
              { k: 'is_staff', label: 'Acesso ao admin' },
              { k: 'is_superuser', label: 'Superusuário' },
            ] as const).map(({ k, label }) => (
              <label key={k} className="flex items-center gap-2 text-sm cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form[k] as boolean}
                  onChange={(e) => set(k, e.target.checked)}
                  className="rounded"
                />
                {label}
              </label>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? 'Criando...' : <><UserPlus className="h-4 w-4" /> Criar usuário</>}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

function UsersPageContent() {
  const { user: me } = useAuthContext();

  const [users, setUsers] = useState<UserAdmin[]>([]);
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingInvites, setLoadingInvites] = useState(true);
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<string[]>([]);
  const [invFilter, setInvFilter] = useState('');
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
  const [invAction, setInvAction] = useState<Set<number>>(new Set());

  const [showInvite, setShowInvite] = useState(false);
  const [showNewUser, setShowNewUser] = useState(false);

  const loadUsers = useCallback(async (q?: string, sectors?: string[]) => {
    setLoadingUsers(true);
    try {
      setUsers(await getUsers({ search: q || undefined, sectors: sectors?.length ? sectors : undefined }));
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar usuários', variant: 'destructive' });
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true);
    try {
      setInvitations(await getInvitations(invFilter || undefined));
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar convites', variant: 'destructive' });
    } finally {
      setLoadingInvites(false);
    }
  }, [invFilter]);

  useEffect(() => { loadInvites(); }, [loadInvites]);

  // Live search — debounced 300ms
  useEffect(() => {
    const timer = setTimeout(() => loadUsers(search, sectorFilter), 300);
    return () => clearTimeout(timer);
  }, [search, sectorFilter.join(',')]);
  useEffect(() => {
    getSectors({ page_size: 200 })
      .then((r) => setSectors((r as any).results ?? r))
      .catch(() => {});
  }, []);

  const handleDelete = async (u: UserAdmin) => {
    if (u.id === Number(me?.id)) {
      toast({ title: 'Ação inválida', description: 'Não é possível remover seu próprio usuário.', variant: 'destructive' });
      return;
    }
    if (!confirm(`Remover ${u.name} (${u.email})?`)) return;
    setDeleting((p) => new Set(p).add(u.id));
    try {
      await deleteUser(u.id);
      toast({ title: 'Usuário removido.' });
      setUsers((p) => p.filter((x) => x.id !== u.id));
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting((p) => { const s = new Set(p); s.delete(u.id); return s; });
    }
  };

  const handleResend = async (inv: UserInvitation) => {
    setInvAction((p) => new Set(p).add(inv.id));
    try {
      await resendInvitation(inv.id);
      toast({ title: 'Convite reenviado!', description: `E-mail reenviado para ${inv.email}.` });
      loadInvites();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setInvAction((p) => { const s = new Set(p); s.delete(inv.id); return s; });
    }
  };

  const handleCancelInv = async (inv: UserInvitation) => {
    if (!confirm(`Cancelar convite para ${inv.email}?`)) return;
    setInvAction((p) => new Set(p).add(inv.id));
    try {
      await cancelInvitation(inv.id);
      toast({ title: 'Convite cancelado.' });
      loadInvites();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setInvAction((p) => { const s = new Set(p); s.delete(inv.id); return s; });
    }
  };

  const pendingCount = invitations.filter((i) => i.status === 'pending').length;

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Usuários</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie o acesso de colaboradores ao sistema.
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowInvite(true)}>
            <Mail className="h-4 w-4" /> Convidar
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setShowNewUser(true)}>
            <UserPlus className="h-4 w-4" /> Novo usuário
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users">
        <TabsList className="h-9">
          <TabsTrigger value="users" className="gap-2 text-xs px-4">
            <Users className="h-3.5 w-3.5" />
            Usuários
            {!loadingUsers && (
              <span className="ml-1 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-medium">
                {users.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="invites" className="gap-2 text-xs px-4">
            <Mail className="h-3.5 w-3.5" />
            Convites
            {pendingCount > 0 && (
              <span className="ml-1 rounded-full bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-medium">
                {pendingCount}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ── Tab: Usuários ── */}
        <TabsContent value="users" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 flex-1 max-w-2xl">
              {/* Live search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por nome, e-mail ou CPF..."
                  className="pl-8 h-9 text-sm bg-background/60 w-full"
                />
              </div>

              {/* Setor */}
              <SectorMultiSelect
                sectors={sectors}
                selectedSectorIds={sectorFilter}
                onSelectionChange={setSectorFilter}
                placeholder="Setores..."
              />
            </div>

            {/* Limpar */}
            {(search || sectorFilter.length > 0) && (
              <button
                onClick={() => { setSearch(''); setSectorFilter([]); }}
                className="shrink-0 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3 h-3" />
                Limpar
              </button>
            )}
          </div>

          {/* List */}
          {loadingUsers ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="flex items-center gap-4 rounded-xl border border-border/60 p-4">
                  <Skeleton className="w-9 h-9 rounded-full shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-44" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                </div>
              ))}
            </div>
          ) : users.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Nenhum usuário encontrado</h3>
                <p className="text-xs text-muted-foreground mt-1">Tente outro termo ou cadastre um novo usuário.</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((u) => {
                const initials = u.name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase();
                const busy = deleting.has(u.id);
                return (
                  <div
                    key={u.id}
                    className="flex items-center gap-4 rounded-xl border border-border/60 p-4 hover:border-primary/20 transition"
                  >
                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold text-primary shrink-0">
                      {u.avatar_url
                        ? <img src={u.avatar_url} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
                        : initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{u.name}</span>
                        {u.is_superuser && (
                          <Badge variant="default" className="gap-1 text-[10px] py-0 px-1.5">
                            <ShieldCheck className="h-3 w-3" /> Superuser
                          </Badge>
                        )}
                        {u.is_staff && !u.is_superuser && (
                          <Badge variant="secondary" className="gap-1 text-[10px] py-0 px-1.5">
                            <Shield className="h-3 w-3" /> Staff
                          </Badge>
                        )}
                        {!u.is_active && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-muted-foreground">
                            Inativo
                          </Badge>
                        )}
                        {u.must_change_password && (
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5 text-amber-600 border-amber-300">
                            Troca senha
                          </Badge>
                        )}
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span>{u.email}</span>
                        {u.sector_name && <span>· {u.sector_name}</span>}
                        {u.position && <span>· {u.position}</span>}
                        <span>· desde {fmtDate(u.date_joined)}</span>
                      </div>
                    </div>

                    {/* Delete */}
                    <Button
                      size="icon" variant="ghost"
                      className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(u)}
                      disabled={busy || u.id === Number(me?.id)}
                      title="Remover usuário"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* ── Tab: Convites ── */}
        <TabsContent value="invites" className="mt-4 space-y-4">
          {/* Filter chips */}
          <div className="flex gap-2 flex-wrap">
            {(['', 'pending', 'used', 'expired', 'cancelled'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setInvFilter(s)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                  invFilter === s
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border/60 text-muted-foreground hover:border-primary/40'
                }`}
              >
                {s === '' ? 'Todos' : STATUS_LABEL[s]}
              </button>
            ))}
          </div>

          {/* List */}
          {loadingInvites ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center justify-between rounded-xl border border-border/60 p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-64" />
                  </div>
                  <Skeleton className="h-8 w-20 rounded-lg" />
                </div>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20 text-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Nenhum convite encontrado</h3>
                <p className="text-xs text-muted-foreground mt-1">Envie um convite para adicionar novos usuários.</p>
              </div>
              <Button size="sm" onClick={() => setShowInvite(true)}>Enviar convite</Button>
            </div>
          ) : (
            <div className="space-y-2">
              {invitations.map((inv) => {
                const busy = invAction.has(inv.id);
                const canResend = inv.status !== 'used';
                const canCancel = inv.status === 'pending';
                return (
                  <div
                    key={inv.id}
                    className="flex items-center gap-4 rounded-xl border border-border/60 p-4 hover:border-primary/20 transition"
                  >
                    {/* Status icon */}
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      inv.status === 'pending' ? 'bg-primary/10' :
                      inv.status === 'used' ? 'bg-emerald-50' :
                      'bg-muted/60'
                    }`}>
                      {inv.status === 'pending' && <Clock className="h-4 w-4 text-primary" />}
                      {inv.status === 'used' && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                      {inv.status === 'expired' && <AlertCircle className="h-4 w-4 text-muted-foreground" />}
                      {inv.status === 'cancelled' && <Ban className="h-4 w-4 text-muted-foreground" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{inv.email}</span>
                        <Badge variant={STATUS_VARIANT[inv.status]} className="text-[10px] py-0 px-1.5">
                          {STATUS_LABEL[inv.status]}
                        </Badge>
                      </div>
                      <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                        <span>por {inv.created_by_name || '—'} em {fmtDateTime(inv.created_at)}</span>
                        {inv.status === 'pending' && <span>· expira {fmtDateTime(inv.expires_at)}</span>}
                        {inv.used_at && <span>· usado em {fmtDateTime(inv.used_at)}</span>}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 shrink-0">
                      {canResend && (
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
                          onClick={() => handleResend(inv)} disabled={busy}>
                          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                          Reenviar
                        </Button>
                      )}
                      {canCancel && (
                        <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => handleCancelInv(inv)} disabled={busy}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <InviteDialog
        open={showInvite}
        onClose={() => setShowInvite(false)}
        onSuccess={loadInvites}
      />
      <NewUserDialog
        open={showNewUser}
        onClose={() => setShowNewUser(false)}
        onSuccess={() => loadUsers(search, sectorFilter.length ? sectorFilter : undefined)}
        sectors={sectors}
      />
    </div>
  );
}

export default function UsersPage() {
  return <AdminGuard requireSuperuser><UsersPageContent /></AdminGuard>
}
