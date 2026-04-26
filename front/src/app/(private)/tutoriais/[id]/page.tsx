'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getTutorial } from '@/lib/api/tutorials';
import type { Tutorial } from '@/types/tutorial.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, Edit, Download, Loader2, BookOpen, Users } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { canEdit, canManageAccess } from '@/lib/permissions';
import { ShareAccessDialog } from '@/components/shared/ShareAccessDialog';
import { getSharedAdminsTutorial, updateSharedAdminsTutorial } from '@/lib/api/tutorials';

export default function TutorialViewPage() {
  const params = useParams();
  const router = useRouter();
  const tutorialId = params.id as string;

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeStep, setActiveStep] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);

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
      const margin = 16;
      const contentWidth = pageWidth - margin * 2;
      const bottomBoundary = pageHeight - 14;
      let y = 0;

      // ── Paleta ───────────────────────────────────────────────────────────
      const PRIMARY: [number, number, number]   = [37, 99, 235];
      const PRIMARY_LIGHT: [number, number, number] = [219, 234, 254];
      const DARK: [number, number, number]      = [15, 23, 42];
      const BODY: [number, number, number]      = [51, 65, 85];
      const MUTED: [number, number, number]     = [100, 116, 139];
      const BORDER: [number, number, number]    = [226, 232, 240];
      const WHITE: [number, number, number]     = [255, 255, 255];
      const SUCCESS: [number, number, number]   = [16, 185, 129];

      const stripHtml = (html: string) => {
        const div = document.createElement('div');
        div.innerHTML = html;
        return (div.textContent || div.innerText || '').trim();
      };

      const getRealLineH = () => doc.getLineHeight() / doc.internal.scaleFactor;

      const checkBreak = (neededMm: number) => {
        if (y + neededMm > bottomBoundary) { doc.addPage(); y = margin; }
      };

      const addText = (
        text: string,
        fontSize: number,
        bold = false,
        color: [number, number, number] = BODY,
        spacingAfter = 2,
        xOffset = 0
      ) => {
        if (!text.trim()) return;
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', bold ? 'bold' : 'normal');
        doc.setTextColor(...color);
        const lineH = getRealLineH();
        const maxW = contentWidth - xOffset;
        const lines = doc.splitTextToSize(text, maxW) as string[];
        for (const line of lines) {
          if (y + lineH > bottomBoundary) { doc.addPage(); y = margin; }
          doc.text(line, margin + xOffset, y);
          y += lineH;
        }
        y += spacingAfter;
      };

      const addSeparator = (color: [number, number, number] = BORDER, weight = 0.3) => {
        checkBreak(6);
        doc.setDrawColor(...color);
        doc.setLineWidth(weight);
        doc.line(margin, y, pageWidth - margin, y);
        y += 5;
      };

      // ── CABEÇALHO ────────────────────────────────────────────────────────
      // Faixa superior azul (header block)
      const headerH = 42;
      doc.setFillColor(...PRIMARY);
      doc.rect(0, 0, pageWidth, headerH, 'F');

      // Linha decorativa inferior do header
      doc.setFillColor(255, 255, 255, 0.15);
      doc.rect(0, headerH - 1.5, pageWidth, 1.5, 'F');

      y = 10;

      // Título
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...WHITE);
      const titleLines = doc.splitTextToSize(tutorial.title, contentWidth - 20) as string[];
      for (const line of titleLines) {
        doc.text(line, margin, y);
        y += doc.getLineHeight() / doc.internal.scaleFactor;
      }

      // Descrição
      if (tutorial.description) {
        y += 1;
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(186, 210, 254); // blue-200
        const descLines = doc.splitTextToSize(tutorial.description, contentWidth - 10) as string[];
        const maxDescLines = descLines.slice(0, 2);
        for (const line of maxDescLines) {
          if (y < headerH - 5) {
            doc.text(line, margin, y);
            y += doc.getLineHeight() / doc.internal.scaleFactor;
          }
        }
      }

      y = headerH + 8;

      // ── METADATA STRIP ───────────────────────────────────────────────────
      // Caixa cinza clara com metadados
      const metaH = 22;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, contentWidth, metaH, 3, 3, 'FD');

      const metaY = y + 5;

      // Setor
      const col = contentWidth / 4;
      const metaItems = [
        { label: 'Setor', value: tutorial.sector_detail.name },
        { label: 'Autor', value: tutorial.created_by_name || '—' },
        { label: 'Passos', value: `${tutorial.steps.length} passo${tutorial.steps.length !== 1 ? 's' : ''}` },
        { label: 'Status', value: tutorial.is_active ? 'Ativo' : 'Inativo' },
      ];

      metaItems.forEach((item, i) => {
        const x = margin + 4 + i * col;
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        doc.text(item.label.toUpperCase(), x, metaY);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...DARK);
        doc.text(item.value, x, metaY + 5);

        // Status: colorido
        if (item.label === 'Status') {
          doc.setTextColor(...(tutorial.is_active ? SUCCESS : MUTED));
          doc.text(item.value, x, metaY + 5);
        }
      });

      // Data de criação à direita
      const createdDate = new Date(tutorial.created_at).toLocaleDateString('pt-BR', {
        day: '2-digit', month: 'long', year: 'numeric',
      });
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...MUTED);
      doc.text(`Criado em ${createdDate}`, pageWidth - margin - 4, metaY + 12, { align: 'right' });

      y += metaH + 10;

      // Tags (se existirem)
      if (tutorial.tags_detail.length > 0) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...MUTED);
        doc.text('TAGS:', margin, y);
        let tagX = margin + 13;
        for (const tag of tutorial.tags_detail) {
          const tagW = doc.getTextWidth(tag.name) + 6;
          if (tagX + tagW > pageWidth - margin) break;
          doc.setFillColor(PRIMARY_LIGHT[0], PRIMARY_LIGHT[1], PRIMARY_LIGHT[2]);
          doc.roundedRect(tagX, y - 3.5, tagW, 5.5, 1.5, 1.5, 'F');
          doc.setFontSize(7.5);
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(...PRIMARY);
          doc.text(tag.name, tagX + 3, y);
          tagX += tagW + 3;
        }
        y += 8;
      }

      addSeparator(BORDER, 0.4);

      // ── CARREGA IMAGEM ───────────────────────────────────────────────────
      const loadImage = async (url: string): Promise<{ dataUrl: string; w: number; h: number } | null> => {
        try {
          const res = await fetch(url);
          const blob = await res.blob();
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });
          const img = new Image();
          await new Promise<void>((resolve) => { img.onload = () => resolve(); img.onerror = () => resolve(); img.src = dataUrl; });
          return { dataUrl, w: img.naturalWidth || 800, h: img.naturalHeight || 600 };
        } catch {
          return null;
        }
      };

      const addImageToPdf = async (url: string, caption?: string) => {
        const result = await loadImage(url);
        if (!result) {
          addText(caption ? `[Imagem: ${caption}]` : '[Imagem]', 8, false, MUTED, 3);
          return;
        }
        const { dataUrl, w, h } = result;
        const maxW = contentWidth - 8;
        const maxH = 85;
        const aspect = w / h;
        let imgW = maxW;
        let imgH = imgW / aspect;
        if (imgH > maxH) { imgH = maxH; imgW = imgH * aspect; }
        const imgX = margin + (contentWidth - imgW) / 2;
        checkBreak(imgH + 12);
        // Borda ao redor da imagem
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.roundedRect(imgX - 1, y - 1, imgW + 2, imgH + 2, 2, 2, 'S');
        doc.addImage(dataUrl, 'JPEG', imgX, y, imgW, imgH);
        y += imgH + 4;
        if (caption) {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.setTextColor(...MUTED);
          doc.text(caption, pageWidth / 2, y, { align: 'center' });
          y += 5;
        }
        y += 3;
      };

      // ── PASSOS ───────────────────────────────────────────────────────────
      for (let index = 0; index < tutorial.steps.length; index++) {
        const step = tutorial.steps[index];

        checkBreak(28);

        // Círculo numerado + label do passo
        const circleX = margin + 4;
        const circleY = y + 4;
        doc.setFillColor(...PRIMARY);
        doc.circle(circleX, circleY, 4, 'F');
        doc.setFontSize(8);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...WHITE);
        const numStr = String(index + 1);
        const numW = doc.getTextWidth(numStr);
        doc.text(numStr, circleX - numW / 2, circleY + 2.5);

        // Label "Passo X de Y" ao lado
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...PRIMARY);
        doc.text(`Passo ${index + 1} de ${tutorial.steps.length}`, margin + 12, y + 5.5);

        y += 12;

        // Título do passo
        addText(step.title, 13, true, DARK, 3, 0);

        // Linha azul lateral decorativa + conteúdo
        const content = stripHtml(step.content);
        if (content) {
          // Barra lateral colorida
          const contentStartY = y;
          addText(content, 10, false, BODY, 3, 5);
          const contentEndY = y;
          doc.setFillColor(...PRIMARY_LIGHT);
          doc.rect(margin, contentStartY - 2, 2.5, contentEndY - contentStartY + 2, 'F');
        }

        // Mídia
        for (const media of step.media) {
          if (media.media_type === 'image' && media.file_url) {
            await addImageToPdf(media.file_url, media.caption || undefined);
          } else if (media.media_type === 'video_embed' && media.embed_url) {
            checkBreak(12);
            doc.setFillColor(254, 242, 242);
            doc.setDrawColor(252, 165, 165);
            doc.setLineWidth(0.3);
            doc.roundedRect(margin, y, contentWidth, 10, 2, 2, 'FD');
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(185, 28, 28);
            const videoLabel = media.caption ? `▶  Vídeo: ${media.caption}` : '▶  Vídeo incorporado';
            doc.text(videoLabel, margin + 4, y + 6.5);
            y += 14;
          }
        }

        if (index < tutorial.steps.length - 1) {
          y += 3;
          addSeparator([226, 232, 240], 0.25);
        }
      }

      // ── RODAPÉ EM TODAS AS PÁGINAS ────────────────────────────────────────
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);

        // Linha rodapé
        doc.setDrawColor(...BORDER);
        doc.setLineWidth(0.3);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);

        // Texto esquerdo — título
        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...MUTED);
        const shortTitle = tutorial.title.length > 50 ? tutorial.title.slice(0, 48) + '…' : tutorial.title;
        doc.text(shortTitle, margin, pageHeight - 7.5);

        // Texto direito — página
        doc.text(`${p} / ${totalPages}`, pageWidth - margin, pageHeight - 7.5, { align: 'right' });
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
          {canManageAccess(tutorial) && (
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setShowShareDialog(true)}>
              <Users className="mr-1.5 h-3.5 w-3.5" />
              Acesso
            </Button>
          )}
          {canEdit(tutorial) && (
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
            {canEdit(tutorial) && (
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
    <ShareAccessDialog
        open={showShareDialog}
        onClose={() => setShowShareDialog(false)}
        resourceId={tutorial?.id?.toString() ?? ""}
        resourceTitle={tutorial?.title ?? ""}
        getAdmins={getSharedAdminsTutorial}
        updateAdmins={updateSharedAdminsTutorial}
      />
    </div>
  );
}
