'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { validateCertificate, type ValidatedCertificate } from '@/lib/api/certificate-company';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, Search, Loader2, AlertCircle, BookOpen } from 'lucide-react';

function ValidationForm() {
  const search = useSearchParams();
  const initialCode = search.get('codigo') || '';
  const [code, setCode] = useState(initialCode);
  const [certificate, setCertificate] = useState<ValidatedCertificate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  async function check(value: string) {
    setError(''); setCertificate(null);
    if (!value.trim()) {setError('Informe o código de validação.');return;}
    setLoading(true);
    try {setCertificate(await validateCertificate(value));}
    catch (error) {setError(error instanceof Error ? error.message : 'Não foi possível consultar o certificado.');}
    finally {setLoading(false);}
  }
  useEffect(()=>{if(initialCode) {setCode(initialCode); void check(initialCode);}},[initialCode]);
  return <main className="min-h-svh bg-background px-4 py-10 sm:py-16">
    <div className="mx-auto max-w-2xl space-y-7">
      <Link href="/login" className="inline-flex items-center gap-2 font-semibold"><BookOpen className="size-6 text-primary"/>InstructAI</Link>
      <div><h1 className="text-3xl font-bold tracking-tight">Validar certificado</h1><p className="text-muted-foreground mt-3">Confira a autenticidade de um certificado emitido pela plataforma. Não é necessário entrar na sua conta.</p></div>
      <form onSubmit={e=>{e.preventDefault();void check(code);}} className="rounded-xl border bg-card p-5 space-y-4">
        <div className="space-y-2"><Label htmlFor="validation-code">Código de validação</Label><Input id="validation-code" value={code} onChange={e=>{setCode(e.target.value);setError('');setCertificate(null);}} placeholder="Digite o código completo que aparece no certificado" autoComplete="off" required maxLength={100}/></div>
        <Button type="submit" className="gap-2" disabled={loading}>{loading?<Loader2 className="size-4 animate-spin"/>:<Search className="size-4"/>}{loading?'Consultando...':'Validar certificado'}</Button>
      </form>
      {error && <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-5 flex items-start gap-3"><AlertCircle className="size-5 shrink-0"/><p>{error}</p></div>}
      {certificate && <section className="rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-5 sm:p-7 space-y-5" aria-label="Resultado da validação">
        <h2 className="font-semibold text-xl flex gap-2 items-center text-emerald-600"><ShieldCheck className="size-6"/>Certificado válido</h2>
        <p className="text-sm text-muted-foreground">Este certificado foi emitido pelo InstructAI. Confira os dados com o documento apresentado.</p>
        <dl className="space-y-4 text-sm">{[
          ['Participante',certificate.student_name],['Curso',certificate.course_name],
          ['Empresa emissora',certificate.company_name || 'InstructAI'],
          ...(certificate.company_cnpj?[['CNPJ',certificate.company_cnpj]]:[]),
          ['Carga horária',`${certificate.workload_hours} horas`],
          ['Data de emissão',new Date(certificate.issued_at).toLocaleDateString('pt-BR')],
          ['Código de validação',certificate.validation_code]
        ].map(([label,value])=><div key={label}><dt className="text-muted-foreground">{label}</dt><dd className="mt-1 font-medium break-words">{value}</dd></div>)}</dl>
      </section>}
      <p className="text-sm text-muted-foreground"><Link href="/login" className="underline underline-offset-4 hover:text-foreground">Acessar o InstructAI</Link></p>
    </div>
  </main>;
}
export default function ValidateCertificatePage() {return <Suspense fallback={<p className="p-8">Carregando consulta...</p>}><ValidationForm/></Suspense>;}
