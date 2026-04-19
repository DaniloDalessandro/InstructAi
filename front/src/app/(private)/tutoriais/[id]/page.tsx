'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTutorial } from '@/lib/api/tutorials';
import type { Tutorial } from '@/types/tutorial.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Edit, Download, Loader2, BookOpen } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuthContext } from '@/contexts/AuthContext';
import { canEditOrDelete } from '@/lib/permissions';

export default function TutorialViewPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuthContext();
  const tutorialId = params.id as string;

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);

  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTutorial();
  }, [tutorialId]);

  const loadTutorial = async () => {
    try {
      setIsLoading(true);
      const data = await getTutorial(tutorialId);
      setTutorial(data);
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar o tutorial.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  // Atualiza passo ativo conforme o scroll
  useEffect(() => {
    if (!tutorial?.steps.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = stepRefs.current.findIndex((r) => r === entry.target);
            if (index !== -1) setActiveStep(index);
          }
        });
      },
      { threshold: 0.3 }
    );

    stepRefs.current.forEach((ref) => { if (ref) observer.observe(ref); });
    return () => observer.disconnect();
  }, [tutorial]);

  const scrollToStep = (index: number) => {
    stepRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const downloadPDF = async () => {
    if (!tutorial) return;
    setIsDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let y = margin;

      const stripHtml = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return (div.textContent || div.innerText || '').trim();
      };

      const lineH = (fontSize: number) => fontSize * 0.42;

      const checkBreak = (neededMm: number) => {
        if (y + neededMm > pageHeight - margin) { doc.addPage(); y = margin; }
      };

      const addText = (text: string, fontSize: number, bold = false, color: [number, number, number] = [30, 30, 30]) => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(text, contentWidth) as string[];
        checkBreak(lines.length * lineH(fontSize) + 4);
        doc.text(lines, margin, y);
        y += lines.length * lineH(fontSize) + 2;
      };

      const addSeparator = (light = false) => {
        checkBreak(6);
        doc.setDrawColor(...(light ? ([210, 210, 210] as [number, number, number]) : ([150, 150, 150] as [number, number, number])));
        doc.setLineWidth(light ? 0.3 : 0.5);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
      };

      doc.setFillColor(37, 99, 235);
      doc.rect(margin, y - 2, contentWidth, 1, 'F');
      y += 3;
      addText(tutorial.title, 20, true, [17, 24, 39]);
      y += 1;
      if (tutorial.description) { addText(tutorial.description, 11, false, [75, 85, 99]); y += 1; }
      const metaItems = [`Setor: ${tutorial.sector_detail.name}`, ...(tutorial.tags_detail.length > 0 ? [`Tags: ${tutorial.tags_detail.map((t) => t.name).join(', ')}`] : []), `Criado por: ${tutorial.created_by_name}`];
      addText(metaItems.join('   •   '), 9, false, [107, 114, 128]);
      y += 2;
      addSeparator();

      tutorial.steps.forEach((step, index) => {
        checkBreak(20);
        doc.setFillColor(239, 246, 255);
        doc.setDrawColor(191, 219, 254);
        doc.roundedRect(margin, y, contentWidth, 8, 2, 2, 'FD');
        doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(37, 99, 235);
        doc.text(`Passo ${index + 1} de ${tutorial.steps.length}`, margin + 3, y + 5.5);
        y += 11;
        addText(step.title, 14, true, [17, 24, 39]);
        y += 1;
        const content = stripHtml(step.content);
        if (content) addText(content, 11, false, [55, 65, 81]);
        step.media.forEach((media) => {
          checkBreak(8);
          doc.setFontSize(9); doc.setFont('helvetica', 'italic'); doc.setTextColor(107, 114, 128);
          if (media.media_type === 'image') {
            const lines = doc.splitTextToSize(media.caption ? `📷 Imagem: ${media.caption}` : '📷 Imagem anexada', contentWidth - 6) as string[];
            doc.text(lines, margin + 3, y); y += lines.length * lineH(9) + 2;
          } else if (media.media_type === 'video_embed' && media.embed_url) {
            const lines = doc.splitTextToSize(media.caption ? `▶ Vídeo: ${media.caption}` : '▶ Vídeo incorporado', contentWidth - 6) as string[];
            doc.text(lines, margin + 3, y); y += lines.length * lineH(9) + 2;
          }
        });
        if (index < tutorial.steps.length - 1) { y += 3; addSeparator(true); }
      });

      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFontSize(8); doc.setFont('helvetica', 'normal'); doc.setTextColor(156, 163, 175);
        doc.text(`${tutorial.title} — Página ${p} de ${totalPages}`, pageWidth / 2, pageHeight - 8, { align: 'center' });
      }

      doc.save(`tutorial_${tutorial.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`);
      toast({ title: 'PDF gerado com sucesso!' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao gerar PDF', variant: 'destructive' });
    } finally {
      setIsDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="animate-pulse space-y-3">
          <div className="h-7 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
          <div className="h-64 bg-muted rounded-xl mt-4" />
        </div>
      </div>
    );
  }

  if (!tutorial) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 border rounded-xl bg-muted/20">
        <BookOpen className="h-12 w-12 text-muted-foreground/40" />
        <div className="text-center">
          <p className="text-lg font-medium">Tutorial não encontrado</p>
          <p className="text-sm text-muted-foreground mt-1">Verifique se o link está correto</p>
        </div>
        <Button size="sm" onClick={() => router.push('/tutoriais')}>
          <ChevronLeft className="mr-1.5 h-4 w-4" />
          Voltar para Tutoriais
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4.5rem)]">

      {/* Cabeçalho fixo */}
      <div className="flex items-center justify-between py-2.5 border-b shrink-0 mb-1">
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => router.push('/tutoriais')}>
          <ChevronLeft className="mr-1 h-3.5 w-3.5" />
          Tutoriais
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={downloadPDF} disabled={isDownloading}>
            {isDownloading
              ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              : <Download className="mr-1.5 h-3.5 w-3.5" />
            }
            PDF
          </Button>
          {canEditOrDelete(tutorial, user?.email) && (
            <Button size="sm" className="h-8 text-xs" onClick={() => router.push(`/tutoriais/${tutorial.id}/editar`)}>
              <Edit className="mr-1.5 h-3.5 w-3.5" />
              Editar
            </Button>
          )}
        </div>
      </div>

      {/* Título e metadados */}
      <div className="py-3 border-b shrink-0">
        <h1 className="text-xl font-bold leading-tight">{tutorial.title}</h1>
        <p className="text-muted-foreground text-sm mt-1 mb-2 line-clamp-2">{tutorial.description}</p>
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">{tutorial.sector_detail.name}</Badge>
          {tutorial.tags_detail.map((tag) => (
            <Badge key={tag.id} className="text-xs border-0" style={{ backgroundColor: tag.color, color: '#fff' }}>
              {tag.name}
            </Badge>
          ))}
        </div>
      </div>

      {tutorial.steps.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center text-center gap-4 py-16">
            <div className="w-16 h-16 rounded-full bg-muted/40 flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-base font-semibold">Este tutorial ainda não possui passos</p>
              <p className="text-sm text-muted-foreground mt-1">Adicione o conteúdo clicando em Editar.</p>
            </div>
            {canEditOrDelete(tutorial, user?.email) && (
              <Button size="sm" onClick={() => router.push(`/tutoriais/${tutorial.id}/editar`)}>
                <Edit className="mr-1.5 h-3.5 w-3.5" />
                Adicionar Passos
              </Button>
            )}
          </div>
        </div>
      ) : (
        /* Área principal: sidebar + conteúdo, ambos com scroll independente */
        <div className="flex-1 flex gap-4 overflow-hidden pt-4">

          {/* Sidebar com scroll próprio */}
          <aside className="hidden lg:flex flex-col w-60 shrink-0">
            <Card className="flex-1 overflow-hidden flex flex-col border-border/60">
              <div className="px-3 py-2.5 border-b shrink-0">
                <h3 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Passos ({tutorial.steps.length})
                </h3>
              </div>
              <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {tutorial.steps.map((step, index) => (
                  <button
                    key={step.id}
                    onClick={() => scrollToStep(index)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all duration-150 ${
                      activeStep === index
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'hover:bg-muted/70 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span className={`text-[10px] block mb-0.5 ${activeStep === index ? 'opacity-70' : 'opacity-50'}`}>
                      Passo {index + 1}
                    </span>
                    <span className="line-clamp-2 leading-snug text-xs">{step.title}</span>
                  </button>
                ))}
              </nav>
            </Card>
          </aside>

          {/* Conteúdo com scroll próprio */}
          <div ref={contentRef} className="flex-1 overflow-y-auto pb-6 space-y-4 pr-1">
            {tutorial.steps.map((step, index) => (
              <div
                key={step.id}
                ref={(el) => { stepRefs.current[index] = el; }}
              >
                <Card className="border-border/60">
                  <CardContent className="p-5 md:p-6">
                    {/* Badge numerado do passo */}
                    <div className="flex items-center gap-2.5 mb-4">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold shrink-0 shadow-sm">
                        {index + 1}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Passo {index + 1} de {tutorial.steps.length}
                      </span>
                    </div>

                    <h2 className="text-lg font-bold mb-3 leading-snug">{step.title}</h2>

                    <div
                      className="prose prose-sm max-w-none text-foreground prose-headings:font-semibold prose-a:text-primary"
                      dangerouslySetInnerHTML={{ __html: step.content }}
                    />

                    {step.media.length > 0 && (
                      <div className="space-y-4 mt-5">
                        {step.media.map((media) => (
                          <div key={media.id}>
                            {media.media_type === 'image' && media.file_url && (
                              <figure className="m-0">
                                <img
                                  src={media.file_url}
                                  alt={media.caption || ''}
                                  className="rounded-xl max-w-full border border-border/40 shadow-sm"
                                />
                                {media.caption && (
                                  <figcaption className="text-xs text-muted-foreground mt-2 text-center">
                                    {media.caption}
                                  </figcaption>
                                )}
                              </figure>
                            )}
                            {media.media_type === 'video_embed' && media.embed_url && (
                              <figure className="m-0">
                                <iframe
                                  src={media.embed_url}
                                  className="w-full aspect-video rounded-xl border border-border/40"
                                  allowFullScreen
                                />
                                {media.caption && (
                                  <figcaption className="text-xs text-muted-foreground mt-2 text-center">
                                    {media.caption}
                                  </figcaption>
                                )}
                              </figure>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Separador visual entre passos */}
                    {index < tutorial.steps.length - 1 && (
                      <div className="mt-5 flex items-center gap-3 text-muted-foreground/25">
                        <div className="flex-1 h-px bg-border" />
                        <span className="text-[11px] tracking-wide uppercase">próximo passo</span>
                        <div className="flex-1 h-px bg-border" />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
