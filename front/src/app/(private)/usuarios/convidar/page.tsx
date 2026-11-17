'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createInvitation } from '@/lib/api/users';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Mail, ArrowLeft, Send, CheckCircle2 } from 'lucide-react';

export default function InviteUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createInvitation(email);
      setSent(true);
      toast({ title: 'Convite enviado!', description: `Um e-mail foi enviado para ${email}.` });
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message || 'Erro ao enviar convite', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in max-w-xl">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Convidar Usuário</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Envie um link de convite por e-mail. O convite expira em 8 horas.
          </p>
        </div>
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mail className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">Convite por e-mail</CardTitle>
              <CardDescription className="text-xs">
                O usuário receberá um link para criar a própria conta.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {sent ? (
            <div className="flex flex-col items-center gap-4 py-6 text-center">
              <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-7 w-7 text-emerald-600" />
              </div>
              <div>
                <p className="font-semibold">Convite enviado!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Um e-mail foi enviado para <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>
              <div className="flex gap-3 mt-2">
                <Button variant="outline" size="sm" onClick={() => { setSent(false); setEmail(''); }}>
                  Enviar outro convite
                </Button>
                <Button size="sm" onClick={() => router.push('/usuarios/convites')}>
                  Ver convites pendentes
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail do convidado</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="colaborador@empresa.com"
                  className="h-10"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full gap-2">
                {loading ? (
                  <>Enviando...</>
                ) : (
                  <><Send className="h-4 w-4" /> Enviar convite</>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
