'use client';

import { useEffect, useState } from 'react';
import { getCertificates } from '@/lib/api/courses';
import type { Certificate } from '@/types/course.types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Award, Download, ExternalLink } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function CertificatesPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadCertificates();
  }, []);

  const loadCertificates = async () => {
    try {
      setIsLoading(true);
      const data = await getCertificates();
      setCertificates(data);
    } catch (error) {
      console.error('Erro ao carregar certificados:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os certificados',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (certificate: Certificate) => {
    if (certificate.pdf_url) {
      window.open(certificate.pdf_url, '_blank');
    } else {
      toast({
        title: 'Aviso',
        description: 'PDF do certificado ainda não foi gerado',
        variant: 'destructive',
      });
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-5 animate-fade-in">
        {/* Skeleton do header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-80" />
        </div>
        {/* Skeleton dos cards */}
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

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Header padronizado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Meus Certificados</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Visualize e baixe seus certificados de conclusão de cursos
        </p>
      </div>

      {/* Lista de Certificados */}
      {certificates.length === 0 ? (
        /* Empty state amigável */
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
          {certificates.map((certificate) => (
            <Card
              key={certificate.id}
              className="hover:border-primary/30 hover:shadow-md transition-all duration-200 border-border/60"
            >
              <CardHeader className="pb-3">
                {/* Ícone e data no topo */}
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
                  Código: {certificate.validation_code.toString().slice(0, 8)}...
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                <p className="text-xs text-muted-foreground">
                  Concluinte: <span className="font-medium text-foreground">{certificate.user_name}</span>
                </p>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleDownload(certificate)}
                    disabled={!certificate.pdf_url}
                    size="sm"
                    className="flex-1 h-8 text-xs"
                  >
                    <Download className="mr-1.5 h-3.5 w-3.5" />
                    Baixar PDF
                  </Button>
                  {certificate.pdf_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 shrink-0"
                      onClick={() => window.open(certificate.pdf_url!, '_blank')}
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>

                {!certificate.pdf_url && (
                  <p className="text-[11px] text-muted-foreground text-center">
                    PDF em processamento...
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
