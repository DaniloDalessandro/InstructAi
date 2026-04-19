'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ToggleGroup,
  ToggleGroupItem,
} from '@/components/ui/toggle-group';
import {
  Edit3, Circle, ArrowRight, Type, Undo, Palette, X, Trash2, Move, Square,
  MapPin, Minus, Ellipsis, Eraser, Redo, Layers, ChevronUp, ChevronDown,
  RotateCw, Copy, Spline
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type AnnotationTool =
  | 'circle'
  | 'arrow'
  | 'text'
  | 'rectangle'
  | 'marker'
  | 'select'
  | 'line'
  | 'ellipse'
  | 'eraser'
  | 'polygon'
  | null;

interface Annotation {
  id: string;
  type: 'circle' | 'arrow' | 'text' | 'rectangle' | 'marker' | 'line' | 'ellipse' | 'polygon';
  color: string;
  lineWidth: number;
  rotation?: number;
  // Círculo e elipse
  x?: number;
  y?: number;
  radius?: number;
  radiusX?: number;
  radiusY?: number;
  // Seta e linha
  fromX?: number;
  fromY?: number;
  toX?: number;
  toY?: number;
  // Texto
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  // Retângulo
  width?: number;
  height?: number;
  // Polígono
  points?: { x: number; y: number }[];
}

interface ImageAnnotationEditorProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
  onSave: (blob: Blob) => void;
}

const COLOR_PALETTE = [
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#FFA500', '#800080', '#008000', '#000080', '#FF1493', '#00CED1',
  '#FFD700', '#FF4500', '#2E8B57', '#4169E1', '#DC143C', '#9370DB',
  '#000000', '#FFFFFF', '#808080', '#C0C0C0'
];

const FONT_FAMILIES = [
  'Arial', 'Helvetica', 'Times New Roman', 'Courier New',
  'Verdana', 'Georgia', 'Comic Sans MS', 'Impact'
];

export default function ImageAnnotationEditor({
  isOpen,
  imageUrl,
  onClose,
  onSave,
}: ImageAnnotationEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedTool, setSelectedTool] = useState<AnnotationTool>('select');
  const [annotationColor, setAnnotationColor] = useState('#FF0000');
  const [lineWidth, setLineWidth] = useState(4);
  const [fontSize, setFontSize] = useState(28);
  const [fontFamily, setFontFamily] = useState('Arial');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isRotating, setIsRotating] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [mouseDownPos, setMouseDownPos] = useState({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState(false);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  const [history, setHistory] = useState<Annotation[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [polygonPoints, setPolygonPoints] = useState<{ x: number; y: number }[]>([]);
  const [currentPolygonId, setCurrentPolygonId] = useState<string | null>(null);

  // Dialog de texto (substitui prompt())
  const [textDialogOpen, setTextDialogOpen] = useState(false);
  const [textDialogValue, setTextDialogValue] = useState('');
  const [pendingTextPos, setPendingTextPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (isOpen && imageUrl) {
      loadImage();
    }
  }, [isOpen, imageUrl]);

  useEffect(() => {
    if (isOpen) {
      redrawCanvas();
    }
  }, [annotations, selectedAnnotationId]);

  const saveToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(JSON.parse(JSON.stringify(newAnnotations)));
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setAnnotations(JSON.parse(JSON.stringify(history[historyIndex - 1])));
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setAnnotations(JSON.parse(JSON.stringify(history[historyIndex + 1])));
    }
  };

  const loadImage = () => {
    setAnnotations([]);
    setHistory([[]]);
    setHistoryIndex(0);
    setSelectedAnnotationId(null);
    setSelectedTool('select');
    setTimeout(() => {
      redrawCanvas();
    }, 100);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      const maxWidth = 3000;
      const maxHeight = 1200;
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      if (height > maxHeight) {
        width = (width * maxHeight) / height;
        height = maxHeight;
      }

      canvas.width = width;
      canvas.height = height;

      ctx.drawImage(img, 0, 0, width, height);

      annotations.forEach((annotation) => {
        drawAnnotation(ctx, annotation, annotation.id === selectedAnnotationId);
      });
    };
    img.src = imageUrl;
  };

  const drawAnnotation = (ctx: CanvasRenderingContext2D, annotation: Annotation, isSelected: boolean) => {
    ctx.save();

    // Se estiver selecionado, adicionar brilho/destaque
    if (isSelected) {
      ctx.shadowColor = '#0066FF';
      ctx.shadowBlur = 10;
    }

    ctx.strokeStyle = annotation.color;
    ctx.fillStyle = annotation.color;
    ctx.lineWidth = annotation.lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Aplica rotação se existir
    if (annotation.rotation && annotation.x !== undefined && annotation.y !== undefined) {
      ctx.translate(annotation.x, annotation.y);
      ctx.rotate((annotation.rotation * Math.PI) / 180);
      ctx.translate(-annotation.x, -annotation.y);
    }

    if (annotation.type === 'rectangle' && annotation.x !== undefined && annotation.y !== undefined && annotation.width !== undefined && annotation.height !== undefined) {
      ctx.beginPath();
      ctx.rect(annotation.x, annotation.y, annotation.width, annotation.height);
      ctx.stroke();

      if (isSelected) {
        drawSelectionHandles(ctx, [
          { x: annotation.x, y: annotation.y },
          { x: annotation.x + annotation.width, y: annotation.y },
          { x: annotation.x + annotation.width, y: annotation.y + annotation.height },
          { x: annotation.x, y: annotation.y + annotation.height },
        ]);
      }
    } else if (annotation.type === 'ellipse' && annotation.x !== undefined && annotation.y !== undefined && annotation.radiusX !== undefined && annotation.radiusY !== undefined) {
      ctx.beginPath();
      ctx.ellipse(annotation.x, annotation.y, annotation.radiusX, annotation.radiusY, 0, 0, 2 * Math.PI);
      ctx.stroke();

      if (isSelected) {
        drawSelectionHandles(ctx, [
          { x: annotation.x, y: annotation.y - annotation.radiusY },
          { x: annotation.x + annotation.radiusX, y: annotation.y },
          { x: annotation.x, y: annotation.y + annotation.radiusY },
          { x: annotation.x - annotation.radiusX, y: annotation.y },
        ]);
      }
    } else if (annotation.type === 'line' && annotation.fromX !== undefined && annotation.fromY !== undefined && annotation.toX !== undefined && annotation.toY !== undefined) {
      ctx.beginPath();
      ctx.moveTo(annotation.fromX, annotation.fromY);
      ctx.lineTo(annotation.toX, annotation.toY);
      ctx.stroke();

      if (isSelected) {
        ctx.fillStyle = '#0066FF';
        ctx.beginPath();
        ctx.arc(annotation.fromX, annotation.fromY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(annotation.toX, annotation.toY, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (annotation.type === 'polygon' && annotation.points && annotation.points.length > 0) {
      ctx.beginPath();
      ctx.moveTo(annotation.points[0].x, annotation.points[0].y);
      for (let i = 1; i < annotation.points.length; i++) {
        ctx.lineTo(annotation.points[i].x, annotation.points[i].y);
      }
      ctx.closePath();
      ctx.stroke();

      if (isSelected) {
        drawSelectionHandles(ctx, annotation.points);
      }
    } else if (annotation.type === 'marker' && annotation.x !== undefined && annotation.y !== undefined) {
      const pinHeight = 30;
      const pinWidth = 20;

      ctx.translate(annotation.x, annotation.y);

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-pinWidth / 2, -pinHeight * 0.6);
      ctx.arc(0, -pinHeight * 0.6, pinWidth / 2, 0, Math.PI, true);
      ctx.lineTo(pinWidth / 2, -pinHeight * 0.6);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(0, -pinHeight * 0.6, pinWidth / 4, 0, 2 * Math.PI);
      ctx.fill();

      if (isSelected) {
        ctx.fillStyle = '#0066FF';
        ctx.beginPath();
        ctx.arc(0, 0, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (annotation.type === 'circle' && annotation.x !== undefined && annotation.y !== undefined && annotation.radius !== undefined) {
      ctx.beginPath();
      ctx.arc(annotation.x, annotation.y, annotation.radius, 0, 2 * Math.PI);
      ctx.stroke();

      if (isSelected) {
        ctx.fillStyle = '#0066FF';
        ctx.beginPath();
        ctx.arc(annotation.x, annotation.y, 6, 0, 2 * Math.PI);
        ctx.fill();

        const handlePositions = [
          { x: annotation.x, y: annotation.y - annotation.radius },
          { x: annotation.x + annotation.radius, y: annotation.y },
          { x: annotation.x, y: annotation.y + annotation.radius },
          { x: annotation.x - annotation.radius, y: annotation.y },
        ];

        drawSelectionHandles(ctx, handlePositions);
      }
    } else if (annotation.type === 'arrow' && annotation.fromX !== undefined && annotation.fromY !== undefined && annotation.toX !== undefined && annotation.toY !== undefined) {
      const headLength = 20;
      const angle = Math.atan2(annotation.toY - annotation.fromY, annotation.toX - annotation.fromX);

      ctx.beginPath();
      ctx.moveTo(annotation.fromX, annotation.fromY);
      ctx.lineTo(annotation.toX, annotation.toY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(annotation.toX, annotation.toY);
      ctx.lineTo(
        annotation.toX - headLength * Math.cos(angle - Math.PI / 6),
        annotation.toY - headLength * Math.sin(angle - Math.PI / 6)
      );
      ctx.lineTo(
        annotation.toX - headLength * Math.cos(angle + Math.PI / 6),
        annotation.toY - headLength * Math.sin(angle + Math.PI / 6)
      );
      ctx.closePath();
      ctx.fill();

      if (isSelected) {
        ctx.fillStyle = '#0066FF';
        ctx.beginPath();
        ctx.arc(annotation.fromX, annotation.fromY, 6, 0, 2 * Math.PI);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(annotation.toX, annotation.toY, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    } else if (annotation.type === 'text' && annotation.x !== undefined && annotation.y !== undefined && annotation.text) {
      const fontSize = annotation.fontSize || 28;
      const fontFamily = annotation.fontFamily || 'Arial';
      ctx.font = `bold ${fontSize}px ${fontFamily}`;
      ctx.fillText(annotation.text, annotation.x, annotation.y);

      if (isSelected) {
        const metrics = ctx.measureText(annotation.text);
        const textWidth = metrics.width;
        const textHeight = fontSize;

        ctx.strokeStyle = '#0066FF';
        ctx.lineWidth = 2;
        ctx.strokeRect(annotation.x - 4, annotation.y - textHeight - 4, textWidth + 8, textHeight + 8);

        ctx.fillStyle = '#0066FF';
        ctx.beginPath();
        ctx.arc(annotation.x, annotation.y, 6, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    ctx.restore();
  };

  const drawSelectionHandles = (ctx: CanvasRenderingContext2D, positions: { x: number; y: number }[]) => {
    // Desenhar alças de seleção maiores e mais visíveis
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = '#0066FF';
    ctx.lineWidth = 3;
    positions.forEach(pos => {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 7, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    });
  };

  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const findAnnotationAt = (x: number, y: number): Annotation | null => {
    for (let i = annotations.length - 1; i >= 0; i--) {
      const annotation = annotations[i];

      if (annotation.type === 'rectangle' && annotation.x !== undefined && annotation.y !== undefined && annotation.width !== undefined && annotation.height !== undefined) {
        // Área de clique expandida (15px de margem)
        if (x >= annotation.x - 15 && x <= annotation.x + annotation.width + 15 &&
            y >= annotation.y - 15 && y <= annotation.y + annotation.height + 15) {
          return annotation;
        }
      } else if (annotation.type === 'ellipse' && annotation.x !== undefined && annotation.y !== undefined && annotation.radiusX !== undefined && annotation.radiusY !== undefined) {
        const normalizedX = (x - annotation.x) / (annotation.radiusX + 15);
        const normalizedY = (y - annotation.y) / (annotation.radiusY + 15);
        // Área de clique expandida
        if (normalizedX * normalizedX + normalizedY * normalizedY <= 1) {
          return annotation;
        }
      } else if (annotation.type === 'polygon' && annotation.points && annotation.points.length > 2) {
        // Teste de ponto dentro do polígono
        let inside = false;
        const points = annotation.points;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
          const xi = points[i].x, yi = points[i].y;
          const xj = points[j].x, yj = points[j].y;
          const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
          if (intersect) inside = !inside;
        }
        if (inside) return annotation;
      } else if (annotation.type === 'marker' && annotation.x !== undefined && annotation.y !== undefined) {
        const distance = Math.sqrt(Math.pow(x - annotation.x, 2) + Math.pow(y - annotation.y, 2));
        if (distance < 20) {
          return annotation;
        }
      } else if (annotation.type === 'circle' && annotation.x !== undefined && annotation.y !== undefined && annotation.radius !== undefined) {
        const distance = Math.sqrt(Math.pow(x - annotation.x, 2) + Math.pow(y - annotation.y, 2));
        // Detectar em toda a área do círculo mais uma margem generosa
        if (distance <= annotation.radius + 15) {
          return annotation;
        }
      } else if ((annotation.type === 'arrow' || annotation.type === 'line') && annotation.fromX !== undefined && annotation.fromY !== undefined && annotation.toX !== undefined && annotation.toY !== undefined) {
        // Calcular distância perpendicular do ponto à linha
        const lineLength = Math.sqrt(Math.pow(annotation.toX - annotation.fromX, 2) + Math.pow(annotation.toY - annotation.fromY, 2));

        if (lineLength === 0) {
          // Linha com comprimento zero, verificar distância ao ponto
          const dist = Math.sqrt(Math.pow(x - annotation.fromX, 2) + Math.pow(y - annotation.fromY, 2));
          if (dist < 20) return annotation;
        } else {
          // Calcular projeção do ponto na linha
          const t = Math.max(0, Math.min(1, ((x - annotation.fromX) * (annotation.toX - annotation.fromX) + (y - annotation.fromY) * (annotation.toY - annotation.fromY)) / (lineLength * lineLength)));
          const projX = annotation.fromX + t * (annotation.toX - annotation.fromX);
          const projY = annotation.fromY + t * (annotation.toY - annotation.fromY);

          // Distância perpendicular do ponto à linha
          const perpDist = Math.sqrt(Math.pow(x - projX, 2) + Math.pow(y - projY, 2));

          // Área de clique generosa ao longo da linha (20px de cada lado)
          if (perpDist < 20) {
            return annotation;
          }
        }
      } else if (annotation.type === 'text' && annotation.x !== undefined && annotation.y !== undefined && annotation.text) {
        const canvas = canvasRef.current;
        if (!canvas) continue;
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        const fontSize = annotation.fontSize || 28;
        const fontFamily = annotation.fontFamily || 'Arial';
        ctx.font = `bold ${fontSize}px ${fontFamily}`;
        const metrics = ctx.measureText(annotation.text);
        const textWidth = metrics.width;
        const textHeight = fontSize;

        if (x >= annotation.x - 4 && x <= annotation.x + textWidth + 4 &&
            y >= annotation.y - textHeight - 4 && y <= annotation.y + 4) {
          return annotation;
        }
      }
    }
    return null;
  };

  const isNearResizeHandle = (x: number, y: number, annotation: Annotation): boolean => {
    if (annotation.type === 'circle' && annotation.x !== undefined && annotation.y !== undefined && annotation.radius !== undefined) {
      const handlePositions = [
        { x: annotation.x, y: annotation.y - annotation.radius },
        { x: annotation.x + annotation.radius, y: annotation.y },
        { x: annotation.x, y: annotation.y + annotation.radius },
        { x: annotation.x - annotation.radius, y: annotation.y },
      ];

      return handlePositions.some(pos => {
        const dist = Math.sqrt(Math.pow(x - pos.x, 2) + Math.pow(y - pos.y, 2));
        return dist < 8;
      });
    }
    return false;
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setMouseDownPos(pos);
    setHasMoved(false);

    // Modo polígono — adiciona pontos ao clicar
    if (selectedTool === 'polygon') {
      const newPoint = { x: pos.x, y: pos.y };

      if (polygonPoints.length === 0) {
        // Inicia novo polígono
        const newId = Math.random().toString(36).substr(2, 9);
        setCurrentPolygonId(newId);
        setPolygonPoints([newPoint]);
      } else {
        // Verifica se o clique está próximo do primeiro ponto para fechar o polígono
        const firstPoint = polygonPoints[0];
        const distToFirst = Math.sqrt(Math.pow(pos.x - firstPoint.x, 2) + Math.pow(pos.y - firstPoint.y, 2));

        if (distToFirst < 15 && polygonPoints.length >= 3) {
          // Fecha o polígono
          const newAnnotation: Annotation = {
            id: currentPolygonId!,
            type: 'polygon',
            color: annotationColor,
            lineWidth: lineWidth,
            points: [...polygonPoints],
          };
          const newAnnotations = [...annotations, newAnnotation];
          setAnnotations(newAnnotations);
          saveToHistory(newAnnotations);
          setPolygonPoints([]);
          setCurrentPolygonId(null);
          setSelectedTool('select');
        } else {
          // Adiciona ponto ao polígono
          setPolygonPoints([...polygonPoints, newPoint]);
        }
      }
      return;
    }

    // Modo borracha
    if (selectedTool === 'eraser') {
      const annotation = findAnnotationAt(pos.x, pos.y);
      if (annotation) {
        const newAnnotations = annotations.filter(a => a.id !== annotation.id);
        setAnnotations(newAnnotations);
        saveToHistory(newAnnotations);
      }
      return;
    }

    // Modo seleção
    if (selectedTool === 'select' || selectedTool === null) {
      const annotation = findAnnotationAt(pos.x, pos.y);

      if (annotation) {
        // Sempre selecionar o elemento clicado
        setSelectedAnnotationId(annotation.id);

        // Preparar para possível arrasto
        if (annotation.id === selectedAnnotationId && isNearResizeHandle(pos.x, pos.y, annotation)) {
          setIsResizing(true);
          setStartPos(pos);
        } else {
          // Calcular offset para arrasto (mas não iniciar arrasto ainda)
          if (annotation.type === 'circle' || annotation.type === 'ellipse' || annotation.type === 'text' || annotation.type === 'marker' || annotation.type === 'rectangle') {
            if (annotation.x !== undefined && annotation.y !== undefined) {
              setDragOffset({ x: pos.x - annotation.x, y: pos.y - annotation.y });
            }
          } else if (annotation.type === 'arrow' || annotation.type === 'line') {
            if (annotation.fromX !== undefined && annotation.fromY !== undefined) {
              setDragOffset({ x: pos.x - annotation.fromX, y: pos.y - annotation.fromY });
            }
          } else if (annotation.type === 'polygon' && annotation.points && annotation.points.length > 0) {
            // Para polígonos, usar o primeiro ponto como referência
            const refX = annotation.x || annotation.points[0].x;
            const refY = annotation.y || annotation.points[0].y;
            setDragOffset({ x: pos.x - refX, y: pos.y - refY });
          }
        }
      } else {
        setSelectedAnnotationId(null);
      }
      return;
    }

    // Inicia desenho de nova anotação
    if (selectedTool) {
      setStartPos(pos);
      setIsDrawing(true);
    }
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);

    // Detectar se o mouse se moveu o suficiente para considerar arrasto (threshold de 5px)
    if (!isDragging && !isResizing && selectedAnnotationId && (selectedTool === 'select' || selectedTool === null)) {
      const distance = Math.sqrt(
        Math.pow(pos.x - mouseDownPos.x, 2) + Math.pow(pos.y - mouseDownPos.y, 2)
      );

      if (distance > 5) {
        setHasMoved(true);
        setIsDragging(true);
      }
    }

    // Mudar cursor quando estiver sobre um elemento selecionável
    if (!isDragging && !isResizing && (selectedTool === 'select' || selectedTool === null)) {
      const annotation = findAnnotationAt(pos.x, pos.y);
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.style.cursor = annotation ? 'move' : 'default';
      }
    }

    if (isDragging && selectedAnnotationId) {
      const annotation = annotations.find(a => a.id === selectedAnnotationId);
      if (!annotation) return;

      const newAnnotations = annotations.map(a => {
        if (a.id !== selectedAnnotationId) return a;

        const newX = pos.x - dragOffset.x;
        const newY = pos.y - dragOffset.y;

        if (a.type === 'circle' || a.type === 'marker' || a.type === 'ellipse') {
          return { ...a, x: newX, y: newY };
        } else if (a.type === 'rectangle') {
          return { ...a, x: newX, y: newY };
        } else if ((a.type === 'arrow' || a.type === 'line') && a.fromX !== undefined && a.fromY !== undefined && a.toX !== undefined && a.toY !== undefined) {
          const deltaX = newX - a.fromX;
          const deltaY = newY - a.fromY;
          return {
            ...a,
            fromX: a.fromX + deltaX,
            fromY: a.fromY + deltaY,
            toX: a.toX + deltaX,
            toY: a.toY + deltaY,
          };
        } else if (a.type === 'text') {
          return { ...a, x: newX, y: newY };
        } else if (a.type === 'polygon' && a.points) {
          const deltaX = newX - (a.x || a.points[0].x);
          const deltaY = newY - (a.y || a.points[0].y);
          return {
            ...a,
            x: newX,
            y: newY,
            points: a.points.map(p => ({ x: p.x + deltaX, y: p.y + deltaY }))
          };
        }
        return a;
      });

      setAnnotations(newAnnotations);
    } else if (isResizing && selectedAnnotationId) {
      const annotation = annotations.find(a => a.id === selectedAnnotationId);
      if (!annotation || annotation.type !== 'circle' || annotation.x === undefined || annotation.y === undefined) return;

      const newRadius = Math.sqrt(Math.pow(pos.x - annotation.x, 2) + Math.pow(pos.y - annotation.y, 2));

      const newAnnotations = annotations.map(a => {
        if (a.id !== selectedAnnotationId) return a;
        return { ...a, radius: Math.max(10, newRadius) };
      });

      setAnnotations(newAnnotations);
    }
  };

  const handleCanvasMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    // Resetar estados sempre que o mouse for solto
    const wasDragging = isDragging;
    const wasResizing = isResizing;

    setIsDragging(false);
    setIsResizing(false);
    setHasMoved(false);

    // Se estava arrastando, salvar no histórico
    if (wasDragging) {
      saveToHistory(annotations);
      return;
    }

    // Se estava redimensionando
    if (wasResizing) {
      saveToHistory(annotations);
      return;
    }

    // Se estava no modo select e não houve movimento, foi apenas um clique de seleção
    if ((selectedTool === 'select' || selectedTool === null)) {
      return;
    }

    if (!isDrawing || !selectedTool || selectedTool === 'select') return;

    const pos = getMousePos(e);
    let newAnnotation: Annotation | null = null;

    if (selectedTool === 'rectangle') {
      const width = pos.x - startPos.x;
      const height = pos.y - startPos.y;
      if (Math.abs(width) > 10 && Math.abs(height) > 10) {
        newAnnotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'rectangle',
          color: annotationColor,
          lineWidth: lineWidth,
          x: Math.min(startPos.x, pos.x),
          y: Math.min(startPos.y, pos.y),
          width: Math.abs(width),
          height: Math.abs(height),
          rotation: 0,
        };
      }
    } else if (selectedTool === 'ellipse') {
      const radiusX = Math.abs(pos.x - startPos.x);
      const radiusY = Math.abs(pos.y - startPos.y);
      if (radiusX > 5 && radiusY > 5) {
        newAnnotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'ellipse',
          color: annotationColor,
          lineWidth: lineWidth,
          x: startPos.x,
          y: startPos.y,
          radiusX: radiusX,
          radiusY: radiusY,
          rotation: 0,
        };
      }
    } else if (selectedTool === 'line') {
      const distance = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      if (distance > 10) {
        newAnnotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'line',
          color: annotationColor,
          lineWidth: lineWidth,
          fromX: startPos.x,
          fromY: startPos.y,
          toX: pos.x,
          toY: pos.y,
        };
      }
    } else if (selectedTool === 'marker') {
      newAnnotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'marker',
        color: annotationColor,
        lineWidth: lineWidth,
        x: startPos.x,
        y: startPos.y,
      };
    } else if (selectedTool === 'circle') {
      const radius = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      if (radius > 5) {
        newAnnotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'circle',
          color: annotationColor,
          lineWidth: lineWidth,
          x: startPos.x,
          y: startPos.y,
          radius: radius,
          rotation: 0,
        };
      }
    } else if (selectedTool === 'arrow') {
      const distance = Math.sqrt(Math.pow(pos.x - startPos.x, 2) + Math.pow(pos.y - startPos.y, 2));
      if (distance > 10) {
        newAnnotation = {
          id: Math.random().toString(36).substr(2, 9),
          type: 'arrow',
          color: annotationColor,
          lineWidth: lineWidth,
          fromX: startPos.x,
          fromY: startPos.y,
          toX: pos.x,
          toY: pos.y,
        };
      }
    } else if (selectedTool === 'text') {
      // Abre Dialog em vez de usar prompt()
      setPendingTextPos({ x: startPos.x, y: startPos.y });
      setTextDialogValue('');
      setTextDialogOpen(true);
      setIsDrawing(false);
      return;
    }

    if (newAnnotation) {
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations);
      setSelectedAnnotationId(newAnnotation.id);
      setSelectedTool('select');
    }

    setIsDrawing(false);
  };

  const handleConfirmTextAnnotation = () => {
    if (textDialogValue.trim() && pendingTextPos) {
      const newAnnotation: Annotation = {
        id: Math.random().toString(36).substr(2, 9),
        type: 'text',
        color: annotationColor,
        lineWidth: lineWidth,
        x: pendingTextPos.x,
        y: pendingTextPos.y,
        text: textDialogValue.trim(),
        fontSize: fontSize,
        fontFamily: fontFamily,
      };
      const newAnnotations = [...annotations, newAnnotation];
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations);
      setSelectedAnnotationId(newAnnotation.id);
      setSelectedTool('select');
    }
    setTextDialogOpen(false);
    setPendingTextPos(null);
    setTextDialogValue('');
  };

  const deleteSelectedAnnotation = () => {
    if (!selectedAnnotationId) return;
    const newAnnotations = annotations.filter(a => a.id !== selectedAnnotationId);
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
    setSelectedAnnotationId(null);
  };

  const duplicateSelectedAnnotation = () => {
    if (!selectedAnnotationId) return;
    const annotation = annotations.find(a => a.id === selectedAnnotationId);
    if (!annotation) return;

    const duplicated = {
      ...JSON.parse(JSON.stringify(annotation)),
      id: Math.random().toString(36).substr(2, 9)
    };

    // Desloca a cópia levemente para distingui-la do original
    if (duplicated.x !== undefined) duplicated.x += 20;
    if (duplicated.y !== undefined) duplicated.y += 20;
    if (duplicated.fromX !== undefined) duplicated.fromX += 20;
    if (duplicated.fromY !== undefined) duplicated.fromY += 20;
    if (duplicated.toX !== undefined) duplicated.toX += 20;
    if (duplicated.toY !== undefined) duplicated.toY += 20;
    if (duplicated.points) {
      duplicated.points = duplicated.points.map(p => ({ x: p.x + 20, y: p.y + 20 }));
    }

    const newAnnotations = [...annotations, duplicated];
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
    setSelectedAnnotationId(duplicated.id);
  };

  const moveLayerUp = () => {
    if (!selectedAnnotationId) return;
    const index = annotations.findIndex(a => a.id === selectedAnnotationId);
    if (index < annotations.length - 1) {
      const newAnnotations = [...annotations];
      [newAnnotations[index], newAnnotations[index + 1]] = [newAnnotations[index + 1], newAnnotations[index]];
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations);
    }
  };

  const moveLayerDown = () => {
    if (!selectedAnnotationId) return;
    const index = annotations.findIndex(a => a.id === selectedAnnotationId);
    if (index > 0) {
      const newAnnotations = [...annotations];
      [newAnnotations[index], newAnnotations[index - 1]] = [newAnnotations[index - 1], newAnnotations[index]];
      setAnnotations(newAnnotations);
      saveToHistory(newAnnotations);
    }
  };

  const rotateSelected = () => {
    if (!selectedAnnotationId) return;
    const newAnnotations = annotations.map(a => {
      if (a.id === selectedAnnotationId) {
        return { ...a, rotation: ((a.rotation || 0) + 15) % 360 };
      }
      return a;
    });
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
  };

  const updateSelectedAnnotationColor = (color: string) => {
    if (!selectedAnnotationId) return;
    const newAnnotations = annotations.map(a =>
      a.id === selectedAnnotationId ? { ...a, color } : a
    );
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
  };

  const updateSelectedAnnotationLineWidth = (width: number) => {
    if (!selectedAnnotationId) return;
    const newAnnotations = annotations.map(a =>
      a.id === selectedAnnotationId ? { ...a, lineWidth: width } : a
    );
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
  };

  const updateSelectedTextFont = (fontFamily: string) => {
    if (!selectedAnnotationId) return;
    const newAnnotations = annotations.map(a =>
      a.id === selectedAnnotationId && a.type === 'text' ? { ...a, fontFamily } : a
    );
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
  };

  const updateSelectedTextSize = (fontSize: number) => {
    if (!selectedAnnotationId) return;
    const newAnnotations = annotations.map(a =>
      a.id === selectedAnnotationId && a.type === 'text' ? { ...a, fontSize } : a
    );
    setAnnotations(newAnnotations);
    saveToHistory(newAnnotations);
  };

  const clearAllAnnotations = () => {
    setAnnotations([]);
    saveToHistory([]);
    setSelectedAnnotationId(null);
  };

  const handleSave = () => {
    // Cancela o modo polígono se estiver ativo
    if (polygonPoints.length > 0) {
      setPolygonPoints([]);
      setCurrentPolygonId(null);
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.toBlob((blob) => {
      if (blob) {
        onSave(blob);
      }
    }, 'image/jpeg', 0.95);
  };

  const selectedAnnotation = selectedAnnotationId ? annotations.find(a => a.id === selectedAnnotationId) : null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="!max-w-none w-[98vw] sm:!max-w-[98vw] md:!max-w-[98vw] lg:!max-w-[98vw] h-[97vh] flex flex-col p-3 gap-2">
        <DialogHeader className="flex-shrink-0 pb-1">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Edit3 className="h-4 w-4" />
            Editor de Imagem Avançado
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col space-y-3 overflow-hidden">
          {/* Toolbar */}
          <div className="flex-shrink-0 space-y-2 max-h-[40vh] overflow-y-auto">
            {/* Tools Row */}
            <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Ferramentas:</Label>
                <ToggleGroup type="single" value={selectedTool || ''} onValueChange={(value) => setSelectedTool(value as AnnotationTool)} className="flex-wrap">
                  <ToggleGroupItem value="select" aria-label="Selecionar" className="gap-1">
                    <Move className="h-4 w-4" />
                    <span className="hidden sm:inline">Selecionar</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="circle" aria-label="Círculo" className="gap-1">
                    <Circle className="h-4 w-4" />
                    <span className="hidden sm:inline">Círculo</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="ellipse" aria-label="Elipse" className="gap-1">
                    <Ellipsis className="h-4 w-4 rotate-90" />
                    <span className="hidden sm:inline">Elipse</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="rectangle" aria-label="Retângulo" className="gap-1">
                    <Square className="h-4 w-4" />
                    <span className="hidden sm:inline">Retângulo</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="line" aria-label="Linha" className="gap-1">
                    <Minus className="h-4 w-4" />
                    <span className="hidden sm:inline">Linha</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="arrow" aria-label="Seta" className="gap-1">
                    <ArrowRight className="h-4 w-4" />
                    <span className="hidden sm:inline">Seta</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="polygon" aria-label="Polígono" className="gap-1">
                    <Spline className="h-4 w-4" />
                    <span className="hidden sm:inline">Polígono</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="marker" aria-label="Marcador" className="gap-1">
                    <MapPin className="h-4 w-4" />
                    <span className="hidden sm:inline">Pin</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="text" aria-label="Texto" className="gap-1">
                    <Type className="h-4 w-4" />
                    <span className="hidden sm:inline">Texto</span>
                  </ToggleGroupItem>
                  <ToggleGroupItem value="eraser" aria-label="Borracha" className="gap-1">
                    <Eraser className="h-4 w-4" />
                    <span className="hidden sm:inline">Borracha</span>
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
            </div>

            {/* Color and Width Controls */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Palette className="h-4 w-4" />
                  Cor:
                </Label>
                <div className="flex gap-1 flex-wrap max-w-md">
                  {COLOR_PALETTE.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => {
                        setAnnotationColor(color);
                        if (selectedAnnotationId) {
                          updateSelectedAnnotationColor(color);
                        }
                      }}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        annotationColor === color ? 'border-foreground scale-110 shadow-lg' : 'border-border hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                  <div className="relative">
                    <Input
                      type="color"
                      value={annotationColor}
                      onChange={(e) => {
                        setAnnotationColor(e.target.value);
                        if (selectedAnnotationId) {
                          updateSelectedAnnotationColor(e.target.value);
                        }
                      }}
                      className="w-10 h-7 p-0.5 cursor-pointer"
                      title="Cor personalizada"
                    />
                  </div>
                </div>
              </div>

              <div className="h-8 w-px bg-border hidden lg:block" />

              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">Espessura:</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 6, 8, 10, 12].map((width) => (
                    <button
                      key={width}
                      type="button"
                      onClick={() => {
                        setLineWidth(width);
                        if (selectedAnnotationId) {
                          updateSelectedAnnotationLineWidth(width);
                        }
                      }}
                      className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                        lineWidth === width
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80'
                      }`}
                    >
                      {width}px
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Text Controls (shown when text is selected) */}
            {selectedAnnotation?.type === 'text' && (
              <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Fonte:</Label>
                  <Select
                    value={selectedAnnotation.fontFamily || fontFamily}
                    onValueChange={updateSelectedTextFont}
                  >
                    <SelectTrigger className="w-[140px] h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_FAMILIES.map((font) => (
                        <SelectItem key={font} value={font} style={{ fontFamily: font }}>
                          {font}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Tamanho:</Label>
                  <div className="flex gap-1">
                    {[16, 20, 24, 28, 32, 40, 48, 64].map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => updateSelectedTextSize(size)}
                        className={`px-2 py-1 rounded text-xs font-medium transition-all ${
                          (selectedAnnotation.fontSize || fontSize) === size
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted hover:bg-muted/80'
                        }`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={undo}
                disabled={historyIndex <= 0}
                className="gap-2"
              >
                <Undo className="h-4 w-4" />
                Desfazer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="gap-2"
              >
                <Redo className="h-4 w-4" />
                Refazer
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAllAnnotations}
                disabled={annotations.length === 0}
                className="gap-2"
              >
                <X className="h-4 w-4" />
                Limpar Tudo
              </Button>

              {selectedAnnotationId && (
                <>
                  <div className="h-8 w-px bg-border" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={duplicateSelectedAnnotation}
                    className="gap-2"
                  >
                    <Copy className="h-4 w-4" />
                    Duplicar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={rotateSelected}
                    className="gap-2"
                  >
                    <RotateCw className="h-4 w-4" />
                    Girar 15°
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={moveLayerUp}
                    className="gap-2"
                  >
                    <ChevronUp className="h-4 w-4" />
                    Frente
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={moveLayerDown}
                    className="gap-2"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Trás
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={deleteSelectedAnnotation}
                    className="gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Deletar
                  </Button>
                </>
              )}

              <div className="ml-auto flex items-center gap-2">
                <span className="text-xs font-medium bg-primary/10 text-primary px-3 py-1 rounded">
                  <Layers className="h-3 w-3 inline mr-1" />
                  {annotations.length} elemento(s)
                </span>
              </div>
            </div>

            {/* Status Text */}
            <div className="text-xs text-muted-foreground text-center p-2 bg-muted/30 rounded">
              {selectedTool === 'select' && selectedAnnotationId && (
                <span className="font-medium text-green-600 dark:text-green-400">
                  ✅ {selectedAnnotation ? `${selectedAnnotation.type.charAt(0).toUpperCase() + selectedAnnotation.type.slice(1)} selecionado` : 'Elemento selecionado'} - Clique para selecionar | Arraste para mover
                </span>
              )}
              {selectedTool === 'select' && !selectedAnnotationId && '👆 Clique em qualquer elemento para selecioná-lo facilmente'}
              {selectedTool === 'circle' && '🔵 Clique e arraste para desenhar um círculo'}
              {selectedTool === 'ellipse' && '🔷 Clique e arraste para desenhar uma elipse'}
              {selectedTool === 'rectangle' && '⬜ Clique e arraste para desenhar um retângulo'}
              {selectedTool === 'line' && '➖ Clique e arraste para desenhar uma linha'}
              {selectedTool === 'arrow' && '➡️ Clique e arraste para desenhar uma seta'}
              {selectedTool === 'polygon' && (polygonPoints.length === 0 ? '📐 Clique para começar um polígono' : `📐 Clique para adicionar pontos (${polygonPoints.length} pontos). Clique no primeiro ponto para fechar`)}
              {selectedTool === 'marker' && '📍 Clique onde deseja adicionar um marcador'}
              {selectedTool === 'text' && '✏️ Clique onde deseja adicionar texto'}
              {selectedTool === 'eraser' && '🧹 Clique em um elemento para apagá-lo'}
            </div>
          </div>

          {/* Canvas */}
          <div className="flex-1 border-2 border-dashed border-border rounded-lg overflow-auto bg-muted/30 flex items-center justify-center p-4">
            <canvas
              ref={canvasRef}
              onMouseDown={handleCanvasMouseDown}
              onMouseMove={handleCanvasMouseMove}
              onMouseUp={handleCanvasMouseUp}
              className={`rounded shadow-lg ${
                isDragging ? 'cursor-grabbing' :
                selectedTool === 'select' ? 'cursor-default' :
                selectedTool === 'eraser' ? 'cursor-not-allowed' :
                selectedTool === 'polygon' ? 'cursor-crosshair' :
                selectedTool ? 'cursor-crosshair' :
                'cursor-default'
              }`}
              style={{ display: 'block', background: '#fff', maxWidth: '100%', maxHeight: '100%' }}
            />
          </div>
        </div>

        <DialogFooter className="flex-shrink-0">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Salvar Anotações
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Dialog de inserção de texto (substitui prompt()) */}
    <Dialog open={textDialogOpen} onOpenChange={(open) => { if (!open) { setTextDialogOpen(false); setPendingTextPos(null); setTextDialogValue(''); } }}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Inserir Texto</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="annotation-text" className="mb-2 block text-sm font-medium">
            Digite o texto da anotação:
          </Label>
          <Input
            id="annotation-text"
            value={textDialogValue}
            onChange={(e) => setTextDialogValue(e.target.value)}
            placeholder="Ex: Clique aqui"
            autoFocus
            onKeyDown={(e) => { if (e.key === 'Enter') handleConfirmTextAnnotation(); }}
          />
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => { setTextDialogOpen(false); setPendingTextPos(null); setTextDialogValue(''); }}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirmTextAnnotation} disabled={!textDialogValue.trim()}>
            Adicionar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
