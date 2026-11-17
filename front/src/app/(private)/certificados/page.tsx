'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { getCertificates, regenerateCertificatePdf } from '@/lib/api/courses';
import type { Certificate } from '@/types/course.types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Award, Download, ExternalLink, RefreshCw, Clock, CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const POLL_INTERVAL = 5000; // 5 segundos

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloading, setDownloading] = useState<number | null>(null);
  const [regenerating, setRegenerating] = useState<Set<number>>(new Set());
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const hasPending = (certs: Certificate[]) => certs.some((c) => !c.pdf_url);

  const load = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await getCertificates();
      setCertificates(data);
      return data;
    } catch {
      if (!silent) toast({ title: 'Erro', description: 'Não foi possível carregar os certificados', variant: 'destructive' });
      return [];
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Polling: re-verifica certificados sem PDF a cada 5s
  useEffect(() => {
    load().then((data) => {
      if (hasPending(data)) {
        pollingRef.current = setInterval(async () => {
          const updated = await load(true);
          if (!hasPending(updated) && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }, POLL_INTERVAL);
      }
    });
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [load]);

  // Quando um PDF novo aparece, para o polling se não houver mais pendentes
  useEffect(() => {
    if (!hasPending(certificates) && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, [certificates]);

  const handleDownload = async (cert: Certificate) => {
    if (!cert.pdf_url) return;
    setDownloading(cert.id);
    try {
      const response = await fetch(cert.pdf_url);
      if (!response.ok) throw new Error('Não foi possível baixar o PDF.');
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `certificado-${cert.validation_code}.pdf`;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast({title:'Erro', description:'Não foi possível baixar o certificado.', variant:'destructive'});
    } finally {setDownloading(null);}
  };

  const handleRegenerate = async (cert: Certificate) => {
    setRegenerating((prev) => new Set(prev).add(cert.id));
    try {
      const updated = await regenerateCertificatePdf(cert.id);
      setCertificates(previous => previous.map(item => item.id === cert.id ? updated : item));
      toast({ title: 'Solicitado', description: 'Re-geração do PDF iniciada. Aguarde alguns segundos.' });
      // Inicia polling
      if (!pollingRef.current) {
        pollingRef.current = setInterval(async () => {
          const updated = await load(true);
          if (!hasPending(updated) && pollingRef.current) {
            clearInterval(pollingRef.current);
            pollingRef.current = null;
          }
        }, POLL_INTERVAL);
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err?.message || 'Erro ao re-gerar certificado', variant: 'destructive' });
    } finally {
      setRegenerating((prev) => { const s = new Set(prev); s.delete(cert.id); return s; });
    }
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });

  if (isLoading) return <PageSkeleton />;

  const pendingCount = certificates.filter((c) => !c.pdf_url).length;

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Meus Certificados</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Visualize e baixe seus certificados de conclusão de cursos
          </p>
        </div>
        {pendingCount > 0 && (
          <Badge variant="secondary" className="gap-1.5 text-xs animate-pulse">
            <Clock className="h-3 w-3" />
            {pendingCount} PDF{pendingCount > 1 ? 's' : ''} sendo gerado{pendingCount > 1 ? 's' : ''}...
          </Badge>
        )}
      </div>

      {certificates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border rounded-xl bg-muted/20 text-center gap-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
            <Award className="h-8 w-8 text-amber-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Nenhum certificado ainda</h3>
            <p className="text-sm text-muted-foreground mt-1.5 max-w-md">
              Complete cursos para receber certificados. Eles são gerados automaticamente
              ao concluir as aulas e passar na prova.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {certificates.map((certificate) => {
            const isPending = !certificate.pdf_url;
            const isRegenerating = regenerating.has(certificate.id);

            return (
              <Card
                key={certificate.id}
                className="hover:border-primary/30 hover:shadow-md transition-all duration-200 border-border/60"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
                      <Award className="h-5 w-5 text-amber-500" />
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {formatDate(certificate.issued_at)}
                    </Badge>
                  </div>
                  <CardTitle className="mt-3 text-base line-clamp-2 leading-snug">
                    {certificate.course_name}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Código: <span className="break-all">{certificate.validation_code}</span>
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-3 pt-0">
                  {certificate.issuer_snapshot?.name && <p className="text-xs text-muted-foreground">Empresa emissora: <span className="text-foreground font-medium">{certificate.issuer_snapshot.name}</span></p>}
                  <a className="block text-xs text-primary underline underline-offset-4" href={`/validar-certificado?codigo=${certificate.validation_code}`} target="_blank" rel="noopener noreferrer">Validar autenticidade</a>
                  <p className="text-xs text-muted-foreground">
                    Concluinte: <span className="font-medium text-foreground">{certificate.user_name}</span>
                  </p>

                  {isPending ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-lg px-3 py-2">
                        {isRegenerating ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin shrink-0" />
                        ) : (
                          <Clock className="h-3.5 w-3.5 animate-pulse shrink-0" />
                        )}
                        <span>{isRegenerating ? 'Re-gerando PDF...' : 'PDF sendo gerado...'}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full h-8 text-xs"
                        onClick={() => handleRegenerate(certificate)}
                        disabled={isRegenerating}
                      >
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isRegenerating ? 'animate-spin' : ''}`} />
                        {isRegenerating ? 'Aguardando...' : 'Tentar novamente'}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>PDF disponível</span>
                      </div>
                      <Button variant="outline" size="sm" className="w-full h-8 text-xs" disabled={isRegenerating} onClick={() => handleRegenerate(certificate)}><RefreshCw className="mr-1.5 size-3.5"/>Atualizar PDF</Button>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleDownload(certificate)}
                          disabled={downloading === certificate.id}
                          size="sm"
                          className="flex-1 h-8 text-xs"
                        >
                          <Download className="mr-1.5 h-3.5 w-3.5" />
                          {downloading === certificate.id ? 'Baixando...' : 'Baixar PDF'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 w-8 p-0 shrink-0"
                          onClick={() => window.open(certificate.pdf_url!, '_blank')}
                          title="Abrir em nova aba"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border-border/60">
            <CardHeader className="space-y-2">
              <Skeleton className="h-8 w-8 rounded-lg" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-full rounded-lg" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
