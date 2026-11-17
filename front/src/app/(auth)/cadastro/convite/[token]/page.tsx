'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { validateInvitationToken, completeRegistration } from '@/lib/api/users';
import { getSectors } from '@/lib/api/sectors';
import type { Sector } from '@/types/sector.types';
import { BookOpen, CheckCircle2, Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';

type Step = 'loading' | 'invalid' | 'form' | 'success';

export default function CompleteInvitePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [step, setStep] = useState<Step>('loading');
  const [email, setEmail] = useState('');
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [form, setForm] = useState({
    name: '',
    cpf: '',
    phone: '',
    position: '',
    sector: '',
    password: '',
    confirm_password: '',
  });

  useEffect(() => {
    async function validate() {
      try {
        const data = await validateInvitationToken(token);
        setEmail(data.email);
        const sectorData = await getSectors({ page_size: 200 });
        setSectors(sectorData.results || (sectorData as any));
        setStep('form');
      } catch {
        setStep('invalid');
      }
    }
    validate();
  }, [token]);

  const set = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm_password) {
      setError('As senhas não coincidem.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await completeRegistration({
        token,
        name: form.name,
        cpf: form.cpf,
        phone: form.phone,
        position: form.position,
        sector: form.sector ? Number(form.sector) : null,
        password: form.password,
        confirm_password: form.confirm_password,
      });
      setStep('success');
    } catch (err: any) {
      setError(err.message || 'Erro ao completar cadastro.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-svh bg-background flex flex-col justify-center items-center p-4 overflow-hidden">
      {/* Background orbs */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: 'radial-gradient(ellipse 65% 45% at 50% -5%, rgba(94,106,210,0.14), transparent 70%)' }} />
      <div aria-hidden className="pointer-events-none absolute -z-10"
        style={{ top: '8%', left: '6%', width: 320, height: 320, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(94,106,210,0.09) 0%, transparent 68%)',
          animation: 'floatOrbA 20s ease-in-out infinite' }} />
      <div aria-hidden className="pointer-events-none absolute -z-10"
        style={{ bottom: '10%', right: '4%', width: 260, height: 260, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(113,112,255,0.08) 0%, transparent 65%)',
          animation: 'floatOrbB 16s ease-in-out infinite', animationDelay: '-6s' }} />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="flex aspect-square size-8 items-center justify-center rounded-lg" style={{ background: '#5e6ad2' }}>
            <BookOpen className="size-4 text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight">InstructAI</span>
        </div>

        {/* Loading */}
        {step === 'loading' && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Verificando convite...</p>
          </div>
        )}

        {/* Invalid */}
        {step === 'invalid' && (
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <h1 className="text-xl font-bold">Convite inválido</h1>
            <p className="text-sm text-muted-foreground">
              Este convite não existe, já foi utilizado ou expirou. Solicite um novo convite ao administrador.
            </p>
            <button onClick={() => router.push('/login')}
              className="mt-2 text-sm text-primary hover:underline">
              Ir para o login
            </button>
          </div>
        )}

        {/* Success */}
        {step === 'success' && (
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-8 text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <h1 className="text-xl font-bold">Cadastro concluído!</h1>
            <p className="text-sm text-muted-foreground">
              Sua conta foi criada com sucesso. Agora você pode fazer login.
            </p>
            <button onClick={() => router.push('/login')}
              className="mt-2 inline-flex items-center justify-center rounded-lg px-6 py-2.5 text-sm font-medium text-white"
              style={{ background: '#5e6ad2' }}>
              Ir para o login
            </button>
          </div>
        )}

        {/* Form */}
        {step === 'form' && (
          <div className="rounded-2xl border border-border/60 bg-card shadow-sm p-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Criar sua conta</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Convite enviado para <span className="font-medium text-foreground">{email}</span>
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Nome completo *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                  placeholder="Seu nome completo"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>

              {/* CPF + Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">CPF</label>
                  <input
                    value={form.cpf}
                    onChange={(e) => set('cpf', e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Telefone</label>
                  <input
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                </div>
              </div>

              {/* Position */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Cargo</label>
                <input
                  value={form.position}
                  onChange={(e) => set('position', e.target.value)}
                  placeholder="Ex: Analista, Coordenador..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                />
              </div>

              {/* Sector */}
              {sectors.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Setor</label>
                  <select
                    value={form.sector}
                    onChange={(e) => set('sector', e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  >
                    <option value="">Selecione um setor</option>
                    {sectors.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Senha *</label>
                <div className="relative">
                  <input
                    required
                    type={showPassword ? 'text' : 'password'}
                    value={form.password}
                    onChange={(e) => set('password', e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                  <button type="button" onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Confirmar senha *</label>
                <div className="relative">
                  <input
                    required
                    type={showConfirm ? 'text' : 'password'}
                    value={form.confirm_password}
                    onChange={(e) => set('confirm_password', e.target.value)}
                    placeholder="Repita a senha"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-9 text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition"
                  />
                  <button type="button" onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2.5 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 flex items-center justify-center gap-2"
                style={{ background: '#5e6ad2' }}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? 'Criando conta...' : 'Criar conta'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
