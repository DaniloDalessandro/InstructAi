'use client';

import { useEffect, useState, useCallback } from 'react';
import { getInvitations, resendInvitation, cancelInvitation } from '@/lib/api/users';
import type { UserInvitation } from '@/types/user.types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import {
  Mail, RefreshCw, X, Clock, CheckCircle2, Ban, AlertCircle, Plus
} from 'lucide-react';
import { useRouter } from 'next/navigation';

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  used: 'Utilizado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
};

const STATUS_VARIANTS: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  pending: 'default',
  used: 'secondary',
  expired: 'outline',
  cancelled: 'destructive',
};

function StatusIcon({ status }: { status: string }) {
  if (status === 'pending') return <Clock className="h-3.5 w-3.5" />;
  if (status === 'used') return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === 'expired') return <AlertCircle className="h-3.5 w-3.5" />;
  return <Ban className="h-3.5 w-3.5" />;
}

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

export default function InvitesPage() {
  const router = useRouter();
  const [invitations, setInvitations] = useState<UserInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<Set<number>>(new Set());
  const [filter, setFilter] = useState<string>('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getInvitations(filter || undefined);
      setInvitations(data);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar os convites', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  const handleResend = async (inv: UserInvitation) => {
    setActionLoading((prev) => new Set(prev).add(inv.id));
    try {
      await resendInvitation(inv.id);
      toast({ title: 'Convite reenviado!', description: `E-mail reenviado para ${inv.email}.` });
      load();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading((prev) => { const s = new Set(prev); s.delete(inv.id); return s; });
    }
  };

  const handleCancel = async (inv: UserInvitation) => {
    if (!confirm(`Cancelar convite para ${inv.email}?`)) return;
    setActionLoading((prev) => new Set(prev).add(inv.id));
    try {
      await cancelInvitation(inv.id);
      toast({ title: 'Convite cancelado.' });
      load();
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' });
    } finally {
      setActionLoading((prev) => { const s = new Set(prev); s.delete(inv.id); return s; });
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Convites</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie os convites de acesso enviados.</p>
        </div>
        <Button size="sm" className="gap-2" onClick={() => router.push('/usuarios/convidar')}>
          <Plus className="h-4 w-4" /> Novo convite
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {['', 'pending', 'used', 'expired', 'cancelled'].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filter === s
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border/60 text-muted-foreground hover:border-primary/40'
            }`}>
            {s === '' ? 'Todos' : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border-border/60">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : invitations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20 text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h3 className="text-base font-semibold">Nenhum convite encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">Envie um convite para adicionar novos usuários.</p>
          </div>
          <Button size="sm" onClick={() => router.push('/usuarios/convidar')}>Enviar convite</Button>
        </div>
      ) : (
        <div className="space-y-2">
          {invitations.map((inv) => {
            const busy = actionLoading.has(inv.id);
            return (
              <Card key={inv.id} className="border-border/60 hover:border-primary/20 transition">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{inv.email}</span>
                        <Badge variant={STATUS_VARIANTS[inv.status]} className="gap-1 text-xs">
                          <StatusIcon status={inv.status} />
                          {STATUS_LABELS[inv.status]}
                        </Badge>
                      </div>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>Enviado por {inv.created_by_name || '—'}</span>
                        <span>em {formatDate(inv.created_at)}</span>
                        {inv.status === 'pending' && (
                          <span>expira {formatDate(inv.expires_at)}</span>
                        )}
                        {inv.used_at && <span>usado em {formatDate(inv.used_at)}</span>}
                      </div>
                    </div>
                    {(inv.status === 'pending' || inv.status === 'expired' || inv.status === 'cancelled') && (
                      <div className="flex gap-2 shrink-0">
                        <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs"
                          onClick={() => handleResend(inv)} disabled={busy}>
                          <RefreshCw className={`h-3.5 w-3.5 ${busy ? 'animate-spin' : ''}`} />
                          Reenviar
                        </Button>
                        {inv.status === 'pending' && (
                          <Button size="sm" variant="outline" className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleCancel(inv)} disabled={busy}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
