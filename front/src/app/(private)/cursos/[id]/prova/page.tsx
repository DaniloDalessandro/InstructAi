'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourse, getExamQuestions, submitExam } from '@/lib/api/courses';
import type { Course, QuestionPublic, ExamResult } from '@/types/course.types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronLeft, Clock, AlertCircle, CheckCircle2, XCircle, Award } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function ExamPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = params.id as string;

  const [course, setCourse] = useState<Course | null>(null);
  const [questions, setQuestions] = useState<QuestionPublic[]>([]);
  const [answers, setAnswers] = useState<Record<string, 'A' | 'B' | 'C' | 'D'>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number>(0); // em segundos
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // Buscar dados do curso e questões
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [courseData, questionsData] = await Promise.all([
          getCourse(courseId),
          getExamQuestions(courseId),
        ]);

        if (!courseData.has_final_exam) {
          toast({
            title: 'Atenção',
            description: 'Este curso não possui prova final',
            variant: 'destructive',
          });
          router.push(`/cursos/${courseId}`);
          return;
        }

        if (questionsData.length === 0) {
          toast({
            title: 'Atenção',
            description: 'Não há questões cadastradas para esta prova',
            variant: 'destructive',
          });
          router.push(`/cursos/${courseId}`);
          return;
        }

        setCourse(courseData);
        setQuestions(questionsData);
        setTimeRemaining(courseData.exam_duration_minutes * 60); // converter para segundos
      } catch (error) {
        console.error('Erro ao carregar prova:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a prova',
          variant: 'destructive',
        });
        router.push(`/cursos/${courseId}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [courseId, router]);

  // Timer countdown
  useEffect(() => {
    if (!examStarted || examFinished || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          handleAutoSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [examStarted, examFinished, timeRemaining]);

  const handleStartExam = () => {
    setExamStarted(true);
  };

  const handleAnswerChange = (questionId: string, option: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: option,
    }));
  };

  const handleAutoSubmit = async () => {
    toast({
      title: 'Tempo esgotado!',
      description: 'Sua prova será enviada automaticamente',
      variant: 'default',
    });
    await handleSubmit(true);
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      // Verificar se todas as questões foram respondidas
      const unanswered = questions.filter((q) => !answers[q.id]);
      if (unanswered.length > 0) {
        toast({
          title: 'Atenção',
          description: `Você ainda tem ${unanswered.length} questão(ões) sem resposta`,
          variant: 'destructive',
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const result = await submitExam(courseId, { answers });
      setExamResult(result);
      setExamFinished(true);

      if (result.passed) {
        toast({
          title: 'Parabéns!',
          description: `Você foi aprovado com ${result.score}% de acerto`,
        });
      } else {
        toast({
          title: 'Não foi dessa vez',
          description: `Você obteve ${result.score}% de acerto. Nota mínima: ${result.passing_score}%`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Erro ao enviar prova:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a prova. Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExit = () => {
    if (examStarted && !examFinished) {
      setShowExitConfirm(true);
    } else {
      router.push(`/cursos/${courseId}`);
    }
  };

  const confirmExit = () => {
    router.push(`/cursos/${courseId}`);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (): string => {
    const percentage = (timeRemaining / (course?.exam_duration_minutes! * 60)) * 100;
    if (percentage <= 20) return 'text-red-600 dark:text-red-400';
    if (percentage <= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  if (isLoading) {
    return <ExamPageSkeleton />;
  }

  if (!course) {
    return null;
  }

  // Tela de Resultado
  if (examFinished && examResult) {
    return (
      <div className="max-w-2xl mx-auto animate-fade-in">
        {/* Animação de Confetti quando aprovado */}
        {examResult.passed && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-confetti"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: '-10%',
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 2}s`,
                }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'][Math.floor(Math.random() * 6)],
                  }}
                />
              </div>
            ))}
          </div>
        )}

        <Card className="relative overflow-hidden">
          {/* Gradiente de fundo quando aprovado */}
          {examResult.passed && (
            <div className="absolute inset-0 bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-950/20 dark:via-emerald-950/20 dark:to-teal-950/20 opacity-50" />
          )}

          <CardHeader className="text-center space-y-4 pb-8 relative">
            {examResult.passed ? (
              <div className="relative">
                <div className="absolute inset-0 animate-ping opacity-75">
                  <CheckCircle2 className="h-20 w-20 mx-auto text-green-600" />
                </div>
                <CheckCircle2 className="h-20 w-20 mx-auto text-green-600 relative animate-scale-in" />
              </div>
            ) : (
              <XCircle className="h-20 w-20 mx-auto text-red-600 animate-shake" />
            )}

            <div className="animate-fade-in-up">
              <h1 className="text-3xl font-bold mb-2">
                {examResult.passed ? 'Parabéns!' : 'Não foi dessa vez'}
              </h1>
              <p className="text-muted-foreground">
                {examResult.passed
                  ? 'Você foi aprovado na prova!'
                  : `Você obteve ${examResult.score}%, mas a nota mínima é ${examResult.passing_score}%`}
              </p>
              {!examResult.passed && (
                <p className="text-sm text-muted-foreground mt-2">
                  Não desanime! Revise o conteúdo e tente novamente.
                </p>
              )}
            </div>
          </CardHeader>

          <CardContent className="space-y-6 relative">
            {/* Estatísticas */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="text-center p-4 border rounded-lg bg-background/50 backdrop-blur">
                <div className="text-3xl font-bold text-primary">{examResult.score}%</div>
                <div className="text-sm text-muted-foreground mt-1">Nota final</div>
              </div>

              <div className="text-center p-4 border rounded-lg bg-background/50 backdrop-blur">
                <div className="text-3xl font-bold">{examResult.correct_count}/{examResult.total_questions}</div>
                <div className="text-sm text-muted-foreground mt-1">Acertos</div>
              </div>
            </div>

            {/* Nota mínima */}
            <div className="p-4 bg-muted/50 backdrop-blur rounded-lg text-center animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <span className="text-sm text-muted-foreground">
                Nota mínima para aprovação: <span className="font-semibold text-foreground">{examResult.passing_score}%</span>
              </span>
            </div>

            {/* Ações */}
            <div className="flex flex-col gap-3 pt-4 animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
              {examResult.passed ? (
                <>
                  <Button
                    onClick={() => router.push('/certificados')}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                    size="lg"
                  >
                    <Award className="mr-2 h-5 w-5" />
                    Visualizar Certificado
                  </Button>
                  <Button onClick={() => router.push(`/cursos/${courseId}`)} variant="outline" className="w-full">
                    Voltar ao Curso
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => window.location.reload()}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
                    size="lg"
                  >
                    <AlertCircle className="mr-2 h-5 w-5" />
                    Refazer Prova
                  </Button>
                  <Button onClick={() => router.push(`/cursos/${courseId}`)} variant="outline" className="w-full">
                    Voltar ao Curso
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <style jsx>{`
          @keyframes confetti {
            0% {
              transform: translateY(0) rotateZ(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotateZ(720deg);
              opacity: 0;
            }
          }

          @keyframes scale-in {
            0% {
              transform: scale(0);
            }
            50% {
              transform: scale(1.2);
            }
            100% {
              transform: scale(1);
            }
          }

          @keyframes fade-in-up {
            0% {
              opacity: 0;
              transform: translateY(20px);
            }
            100% {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes shake {
            0%, 100% {
              transform: translateX(0);
            }
            25% {
              transform: translateX(-10px) rotate(-5deg);
            }
            75% {
              transform: translateX(10px) rotate(5deg);
            }
          }

          .animate-confetti {
            animation: confetti linear forwards;
          }

          .animate-scale-in {
            animation: scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
          }

          .animate-fade-in-up {
            animation: fade-in-up 0.6s ease-out forwards;
            opacity: 0;
          }

          .animate-shake {
            animation: shake 0.5s ease-in-out;
          }
        `}</style>
      </div>
    );
  }

  // Tela Inicial - Antes de iniciar a prova
  if (!examStarted) {
    return (
      <div className="max-w-2xl mx-auto space-y-4 animate-fade-in">
        <button
          onClick={handleExit}
          className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Voltar ao Curso
        </button>

        <Card>
          <CardHeader>
            <h1 className="text-2xl font-bold">{course.name}</h1>
            <p className="text-muted-foreground">Prova Final</p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Informações da Prova */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span>Duração: <strong>{course.exam_duration_minutes} minutos</strong></span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>Total de questões: <strong>{questions.length}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
                <span>Nota mínima: <strong>{course.passing_score}%</strong></span>
              </div>
            </div>

            {/* Instruções */}
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <h3 className="font-semibold">Instruções:</h3>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Leia atentamente cada questão antes de responder</li>
                <li>Você tem {course.exam_duration_minutes} minutos para concluir a prova</li>
                <li>Responda todas as questões antes de enviar</li>
                <li>Após o tempo esgotar, a prova será enviada automaticamente</li>
                <li>Você pode revisar suas respostas antes de enviar</li>
              </ul>
            </div>

            {/* Botão Iniciar */}
            <Button onClick={handleStartExam} className="w-full" size="lg">
              Iniciar Prova
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Tela da Prova - Durante a prova
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <>
      <div className="max-w-4xl mx-auto animate-fade-in">
        {/* Header Fixo */}
        <div className="sticky top-0 z-10 bg-background pb-4 mb-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{course.name}</h1>
              <p className="text-sm text-muted-foreground">Prova Final</p>
            </div>

            {/* Timer */}
            <div className="flex items-center gap-4">
              <div className={cn('flex items-center gap-2 text-lg font-bold', getTimerColor())}>
                <Clock className="h-5 w-5" />
                <span>{formatTime(timeRemaining)}</span>
              </div>

              <Button variant="outline" onClick={handleExit} size="sm">
                Sair
              </Button>
            </div>
          </div>

          {/* Progresso */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-muted-foreground">
                {answeredCount} de {questions.length} questões respondidas
              </span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Questões */}
        <div className="space-y-6 pb-24">
          {questions.map((question, index) => (
            <Card key={question.id} className={cn(
              'transition-all',
              answers[question.id] && 'border-primary/50 shadow-sm'
            )}>
              <CardHeader>
                <div className="flex items-start gap-3">
                  <Badge variant={answers[question.id] ? 'default' : 'secondary'} className="shrink-0">
                    {index + 1}
                  </Badge>
                  <p className="text-base font-medium leading-relaxed flex-1">
                    {question.text}
                  </p>
                </div>
              </CardHeader>

              <CardContent>
                <RadioGroup
                  value={answers[question.id] || ''}
                  onValueChange={(value) => handleAnswerChange(question.id, value as 'A' | 'B' | 'C' | 'D')}
                >
                  <div className="space-y-3">
                    {(['A', 'B', 'C', 'D'] as const).map((option) => (
                      <div
                        key={option}
                        className={cn(
                          'flex items-start space-x-3 p-3 rounded-lg border transition-all cursor-pointer hover:bg-muted/50',
                          answers[question.id] === option && 'bg-primary/10 border-primary'
                        )}
                        onClick={() => handleAnswerChange(question.id, option)}
                      >
                        <RadioGroupItem value={option} id={`${question.id}-${option}`} className="mt-0.5" />
                        <Label
                          htmlFor={`${question.id}-${option}`}
                          className="text-sm leading-relaxed cursor-pointer flex-1"
                        >
                          <span className="font-semibold mr-2">{option})</span>
                          {question[`option_${option.toLowerCase()}` as keyof QuestionPublic]}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Botão Enviar Fixo */}
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={() => handleSubmit()}
              disabled={isSubmitting || answeredCount < questions.length}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? 'Enviando...' : `Enviar Prova (${answeredCount}/${questions.length})`}
            </Button>
          </div>
        </div>
      </div>

      {/* Diálogo de Confirmação de Saída */}
      <AlertDialog open={showExitConfirm} onOpenChange={setShowExitConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deseja realmente sair?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está no meio da prova. Se sair agora, perderá todo o progresso e terá que começar novamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Prova</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Sair e Perder Progresso
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// Skeleton de Loading
function ExamPageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <Skeleton className="h-10 w-32 mb-6" />
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4 mb-2" />
          <Skeleton className="h-4 w-1/4" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}
