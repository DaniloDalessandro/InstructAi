'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getCourse, getExamQuestions, submitExam } from '@/lib/api/courses';
import type { Course, QuestionPublic, ExamResult, QuestionResult } from '@/types/course.types';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  ChevronLeft, ChevronRight, Clock, AlertCircle, CheckCircle2, XCircle,
  Award, BookOpen, Target, FileQuestion, Loader2, Send, GraduationCap,
} from 'lucide-react';
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
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [examStarted, setExamStarted] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [examResult, setExamResult] = useState<ExamResult | null>(null);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [courseData, questionsData] = await Promise.all([
          getCourse(courseId),
          getExamQuestions(courseId),
        ]);
        if (!courseData.has_final_exam) {
          toast({ title: 'Este curso não possui prova final', variant: 'destructive' });
          router.push(`/cursos/${courseId}`);
          return;
        }
        if (questionsData.length === 0) {
          toast({ title: 'Não há questões cadastradas para esta prova', variant: 'destructive' });
          router.push(`/cursos/${courseId}`);
          return;
        }
        setCourse(courseData);
        setQuestions(questionsData);
        setTimeRemaining(courseData.exam_duration_minutes * 60);
      } catch {
        toast({ title: 'Não foi possível carregar a prova', variant: 'destructive' });
        router.push(`/cursos/${courseId}`);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [courseId, router]);

  // Timer
  useEffect(() => {
    if (!examStarted || examFinished || timeRemaining <= 0) return;
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) { handleAutoSubmit(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [examStarted, examFinished, timeRemaining]);

  const handleAnswerChange = (questionId: string, option: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({ ...prev, [questionId]: option }));
  };

  const handleAutoSubmit = async () => {
    toast({ title: 'Tempo esgotado!', description: 'Sua prova foi enviada automaticamente' });
    await handleSubmit(true);
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      const unanswered = questions.filter((q) => !answers[q.id]);
      if (unanswered.length > 0) {
        toast({
          title: 'Questões sem resposta',
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
    } catch {
      toast({ title: 'Erro ao enviar prova', description: 'Tente novamente.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExit = () => {
    if (examStarted && !examFinished) setShowExitConfirm(true);
    else router.push(`/cursos/${courseId}`);
  };

  const goToQuestion = (index: number) => {
    if (index >= 0 && index < questions.length) {
      setCurrentQuestionIndex(index);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const timerPct = course ? (timeRemaining / (course.exam_duration_minutes * 60)) * 100 : 100;
  const timerColor =
    timerPct <= 20 ? 'text-rose-500' :
    timerPct <= 50 ? 'text-amber-500' :
    'text-emerald-500';

  // ── Loading ──────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="-mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Carregando prova...</p>
        </div>
      </div>
    );
  }

  if (!course) return null;

  // ── Resultado ────────────────────────────────────────────────
  if (examFinished && examResult) {
    const passed = examResult.passed;
    const qr = examResult.question_results ?? {};

    return (
      <div className="-mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">
        {/* Confetti */}
        {passed && (
          <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
            {[...Array(40)].map((_, i) => (
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
                  style={{ backgroundColor: ['#7c3aed','#2563eb','#059669','#d97706','#dc2626','#db2777'][Math.floor(Math.random() * 6)] }}
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-8">
          <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-5 items-start">

              {/* Card principal */}
              <div className={cn(
                'rounded-3xl border-2 overflow-hidden shadow-xl',
                passed ? 'border-emerald-500/30' : 'border-rose-500/30',
              )}>
                <div className={cn(
                  'px-8 py-10 text-center',
                  passed
                    ? 'bg-gradient-to-br from-emerald-500/10 to-teal-500/5'
                    : 'bg-gradient-to-br from-rose-500/10 to-orange-500/5',
                )}>
                  <div className={cn(
                    'w-20 h-20 rounded-full mx-auto mb-5 grid place-items-center shadow-lg',
                    passed ? 'bg-emerald-500' : 'bg-rose-500',
                  )}>
                    {passed
                      ? <CheckCircle2 className="w-10 h-10 text-white" />
                      : <XCircle className="w-10 h-10 text-white" />
                    }
                  </div>
                  <h1 className="text-3xl font-bold tracking-tight mb-2">
                    {passed ? 'Parabéns!' : 'Não foi dessa vez'}
                  </h1>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto">
                    {passed
                      ? 'Você foi aprovado na prova final. Seu certificado já está disponível!'
                      : `Obteve ${examResult.score}%, mas o mínimo é ${examResult.passing_score}%. Revise o conteúdo e tente novamente.`}
                  </p>
                </div>

                <div className="bg-card px-8 py-6 space-y-5">
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'Nota Final', value: `${examResult.score}%`, highlight: true },
                      { label: 'Acertos', value: `${examResult.correct_count}/${examResult.total_questions}` },
                      { label: 'Mínimo', value: `${examResult.passing_score}%` },
                    ].map(({ label, value, highlight }) => (
                      <div key={label} className="text-center p-3 rounded-2xl bg-muted/40">
                        <div className={cn(
                          'text-2xl font-bold tabular-nums',
                          highlight && passed && 'text-emerald-600 dark:text-emerald-400',
                          highlight && !passed && 'text-rose-600 dark:text-rose-400',
                        )}>
                          {value}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-2.5 pt-1">
                    {passed ? (
                      <>
                        <Button
                          onClick={() => router.push('/certificados')}
                          size="lg"
                          className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-90 text-white border-0"
                        >
                          <Award className="mr-2 h-4 w-4" />
                          Ver Certificado
                        </Button>
                        <Button onClick={() => router.push(`/cursos/${courseId}`)} variant="outline" className="w-full">
                          Voltar ao Curso
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          onClick={() => window.location.reload()}
                          size="lg"
                          className="w-full bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white border-0"
                        >
                          <AlertCircle className="mr-2 h-4 w-4" />
                          Tentar Novamente
                        </Button>
                        <Button onClick={() => router.push(`/cursos/${courseId}`)} variant="outline" className="w-full">
                          Voltar ao Curso
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Gabarito sidebar */}
              <div className="rounded-2xl border bg-card overflow-hidden shadow-sm">
                <div className="px-4 py-3 border-b bg-muted/30">
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Gabarito</p>
                </div>
                <div className="p-4 space-y-1.5 max-h-[480px] overflow-y-auto">
                  {questions.map((q, i) => {
                    const r: QuestionResult | undefined = qr[q.id];
                    const correct = r?.correct;
                    return (
                      <div
                        key={q.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm',
                          correct === true  && 'border-emerald-500/30 bg-emerald-500/5',
                          correct === false && 'border-rose-500/30 bg-rose-500/5',
                          correct === undefined && 'border-border bg-muted/20',
                        )}
                      >
                        <span className={cn(
                          'w-6 h-6 rounded-lg shrink-0 grid place-items-center text-[11px] font-bold',
                          correct === true  && 'bg-emerald-500 text-white',
                          correct === false && 'bg-rose-500 text-white',
                          correct === undefined && 'bg-muted text-muted-foreground',
                        )}>
                          {i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          {r ? (
                            <div className="flex items-center gap-1.5">
                              <span className={cn(
                                'text-[11px] font-semibold px-1.5 py-0.5 rounded',
                                correct ? 'text-emerald-700 dark:text-emerald-400' : 'text-rose-700 dark:text-rose-400 line-through',
                              )}>
                                {r.your_answer}
                              </span>
                              {!correct && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">→</span>
                                  <span className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 px-1.5 py-0.5 rounded bg-emerald-500/10">
                                    {r.correct_answer}
                                  </span>
                                </>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-muted-foreground">Sem resposta</span>
                          )}
                        </div>
                        {correct === true  && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
                        {correct === false && <XCircle className="w-4 h-4 text-rose-500 shrink-0" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes confetti {
            0% { transform: translateY(0) rotateZ(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotateZ(720deg); opacity: 0; }
          }
          .animate-confetti { animation: confetti linear forwards; }
        `}</style>
      </div>
    );
  }

  // ── Pré-prova ────────────────────────────────────────────────
  if (!examStarted) {
    return (
      <>
        <div className="-mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

          {/* Top nav bar */}
          <div className="shrink-0 border-b bg-card/80 backdrop-blur px-4 md:px-6 py-3">
            <Button
              variant="ghost"
              onClick={handleExit}
              className="h-9 gap-2 text-muted-foreground hover:text-foreground -ml-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Voltar ao Curso
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto flex items-center justify-center px-4 py-10">
            <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-400">
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 items-center">
                {/* Info card */}
                <div className="rounded-3xl border bg-card overflow-hidden shadow-sm">
                  <div className="px-8 py-8 bg-gradient-to-br from-primary/10 to-purple-500/5 border-b text-center">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-purple-500 grid place-items-center mx-auto mb-4 shadow-lg shadow-primary/20">
                      <BookOpen className="w-7 h-7 text-white" />
                    </div>
                    <h1 className="text-xl font-bold tracking-tight">{course.name}</h1>
                    <p className="text-sm text-muted-foreground mt-1">Prova Final</p>
                  </div>

                  <div className="grid grid-cols-3 divide-x border-b">
                    {[
                      { icon: Clock, label: 'Duração', value: `${course.exam_duration_minutes} min` },
                      { icon: FileQuestion, label: 'Questões', value: `${questions.length}` },
                      { icon: Target, label: 'Nota mínima', value: `${course.passing_score}%` },
                    ].map(({ icon: Icon, label, value }) => (
                      <div key={label} className="flex flex-col items-center justify-center py-5 px-3 text-center gap-1.5">
                        <Icon className="w-4 h-4 text-primary/70" />
                        <span className="text-lg font-bold tabular-nums">{value}</span>
                        <span className="text-[11px] text-muted-foreground">{label}</span>
                      </div>
                    ))}
                  </div>

                  <div className="px-8 py-6 space-y-4">
                    <h3 className="text-sm font-semibold">Antes de começar</h3>
                    <ul className="space-y-2.5">
                      {[
                        'Leia cada questão com atenção antes de responder.',
                        `Você tem ${course.exam_duration_minutes} minutos. O timer começa ao clicar em "Iniciar".`,
                        'Navegue entre as questões com os botões Anterior e Próxima.',
                        'Ao esgotar o tempo, a prova é enviada automaticamente.',
                      ].map((item, i) => (
                        <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold grid place-items-center shrink-0 mt-0.5">
                            {i + 1}
                          </span>
                          {item}
                        </li>
                      ))}
                    </ul>

                    <Button
                      onClick={() => setExamStarted(true)}
                      size="lg"
                      className="w-full mt-2 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white border-0 shadow-md shadow-primary/20"
                    >
                      Iniciar Prova
                    </Button>
                  </div>
                </div>

                {/* Animation panel */}
                <div className="hidden lg:flex flex-col items-center justify-center py-8">
                  <div className="relative w-72 h-72 flex items-center justify-center">
                    {/* Pulsing rings */}
                    <div className="absolute inset-0 rounded-full border-2 border-primary/10 exam-ring-1" />
                    <div className="absolute inset-5 rounded-full border-2 border-purple-400/15 exam-ring-2" />
                    <div className="absolute inset-10 rounded-full bg-gradient-to-br from-primary/10 to-purple-400/8 exam-ring-3" />

                    {/* Center icon */}
                    <div
                      className="relative z-10 w-28 h-28 rounded-3xl bg-gradient-to-br from-primary to-purple-500 shadow-2xl shadow-primary/30 flex items-center justify-center exam-float"
                    >
                      <GraduationCap className="w-14 h-14 text-white" />
                    </div>

                    {/* Orbit icons */}
                    <div className="absolute top-7 right-8 w-11 h-11 rounded-2xl bg-card border shadow-sm flex items-center justify-center exam-orbit-1">
                      <Clock className="w-5 h-5 text-primary/60" />
                    </div>
                    <div className="absolute bottom-8 right-5 w-11 h-11 rounded-2xl bg-card border shadow-sm flex items-center justify-center exam-orbit-2">
                      <Target className="w-5 h-5 text-purple-500/70" />
                    </div>
                    <div className="absolute bottom-9 left-5 w-11 h-11 rounded-2xl bg-card border shadow-sm flex items-center justify-center exam-orbit-3">
                      <FileQuestion className="w-5 h-5 text-amber-500/70" />
                    </div>
                  </div>

                  <div className="text-center mt-6">
                    <p className="text-lg font-semibold">Concentre-se!</p>
                    <p className="text-sm text-muted-foreground mt-1 max-w-[200px]">
                      Você está preparado. Boa sorte na prova!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes examFloat {
            0%, 100% { transform: translateY(0px) rotate(0deg); }
            33% { transform: translateY(-10px) rotate(2deg); }
            66% { transform: translateY(-5px) rotate(-1deg); }
          }
          @keyframes examRingPulse {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.5; transform: scale(1.04); }
          }
          @keyframes examOrbit {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-6px); }
          }
          .exam-float { animation: examFloat 4s ease-in-out infinite; }
          .exam-ring-1 { animation: examRingPulse 3s ease-in-out infinite; }
          .exam-ring-2 { animation: examRingPulse 3s ease-in-out infinite 0.6s; }
          .exam-ring-3 { animation: examRingPulse 3s ease-in-out infinite 1.2s; }
          .exam-orbit-1 { animation: examOrbit 2.8s ease-in-out infinite; }
          .exam-orbit-2 { animation: examOrbit 2.8s ease-in-out infinite 0.9s; }
          .exam-orbit-3 { animation: examOrbit 2.8s ease-in-out infinite 1.8s; }
        `}</style>
      </>
    );
  }

  // ── Prova em andamento ───────────────────────────────────────
  const currentQuestion = questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const examProgress = (answeredCount / questions.length) * 100;

  return (
    <>
      <div className="-mx-4 -my-6 md:-mx-6 h-[calc(100vh-3.5rem)] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="shrink-0 border-b bg-card/95 backdrop-blur px-4 md:px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Prova Final</p>
              <h2 className="text-sm font-semibold truncate">{course.name}</h2>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className={cn('flex items-center gap-1.5 font-bold text-lg tabular-nums', timerColor)}>
                <Clock className="h-4 w-4" />
                {formatTime(timeRemaining)}
              </div>
              <Button variant="outline" size="sm" onClick={handleExit} className="h-8 text-xs">
                Sair
              </Button>
            </div>
          </div>
          {/* Progress */}
          <div className="mt-2.5 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{answeredCount} de {questions.length} respondidas</span>
              <span className="font-semibold text-foreground">{Math.round(examProgress)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500 rounded-full"
                style={{ width: `${examProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Body: questão atual + sidebar */}
        <div className="flex-1 overflow-hidden flex">

          {/* Questão atual */}
          <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6">
            <div className="max-w-2xl mx-auto">
              {/* Question counter + status */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Questão</span>
                  <span className="text-xl font-bold tabular-nums text-foreground">{currentQuestionIndex + 1}</span>
                  <span className="text-sm text-muted-foreground">de {questions.length}</span>
                </div>
                <span className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-full border transition-all',
                  answers[currentQuestion.id]
                    ? 'bg-primary/10 border-primary/30 text-primary'
                    : 'bg-muted border-border text-muted-foreground',
                )}>
                  {answers[currentQuestion.id] ? '✓ Respondida' : 'Sem resposta'}
                </span>
              </div>

              {/* Question card */}
              <div className={cn(
                'rounded-2xl border bg-card overflow-hidden transition-all duration-200',
                answers[currentQuestion.id] ? 'border-primary/40 shadow-lg shadow-primary/5' : 'border-border shadow-sm',
              )}>
                <div className="px-7 py-6 flex items-start gap-4 border-b bg-muted/20">
                  <span className={cn(
                    'w-10 h-10 rounded-xl shrink-0 grid place-items-center text-sm font-bold transition-colors',
                    answers[currentQuestion.id] ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                  )}>
                    {currentQuestionIndex + 1}
                  </span>
                  <p className="text-base font-medium leading-relaxed flex-1 pt-1.5">{currentQuestion.text}</p>
                </div>

                <div className="p-6">
                  <RadioGroup
                    value={answers[currentQuestion.id] || ''}
                    onValueChange={(v) => handleAnswerChange(currentQuestion.id, v as 'A' | 'B' | 'C' | 'D')}
                  >
                    <div className="space-y-3">
                      {(['A', 'B', 'C', 'D'] as const).map((option) => {
                        const selected = answers[currentQuestion.id] === option;
                        return (
                          <div
                            key={option}
                            onClick={() => handleAnswerChange(currentQuestion.id, option)}
                            className={cn(
                              'flex items-center gap-4 px-5 py-4 rounded-xl border cursor-pointer transition-all duration-150',
                              selected
                                ? 'bg-primary/10 border-primary text-foreground shadow-sm'
                                : 'hover:bg-muted/50 border-border text-muted-foreground hover:text-foreground',
                            )}
                          >
                            <span className={cn(
                              'w-8 h-8 rounded-lg shrink-0 grid place-items-center text-xs font-bold transition-colors',
                              selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                            )}>
                              {option}
                            </span>
                            <RadioGroupItem value={option} id={`${currentQuestion.id}-${option}`} className="sr-only" />
                            <Label
                              htmlFor={`${currentQuestion.id}-${option}`}
                              className="text-sm leading-relaxed cursor-pointer flex-1"
                            >
                              {currentQuestion[`option_${option.toLowerCase()}` as keyof QuestionPublic]}
                            </Label>
                          </div>
                        );
                      })}
                    </div>
                  </RadioGroup>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar de navegação */}
          <div className="hidden lg:flex flex-col w-56 shrink-0 border-l bg-card/60">
            <div className="px-4 py-3 border-b">
              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Questões</p>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <div className="grid grid-cols-4 gap-1.5">
                {questions.map((q, i) => {
                  const answered = !!answers[q.id];
                  const isCurrent = i === currentQuestionIndex;
                  return (
                    <button
                      key={q.id}
                      onClick={() => goToQuestion(i)}
                      title={`Questão ${i + 1}${answered ? ' — respondida' : ' — não respondida'}`}
                      className={cn(
                        'w-full aspect-square rounded-lg text-xs font-bold transition-all hover:scale-105',
                        isCurrent && 'ring-2 ring-primary ring-offset-1 ring-offset-background',
                        answered
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80',
                      )}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>

              {/* Legenda */}
              <div className="mt-4 space-y-1.5 px-1">
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-4 h-4 rounded bg-primary inline-block shrink-0" />
                  Respondida
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-4 h-4 rounded bg-muted inline-block shrink-0" />
                  Pendente
                </div>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="w-4 h-4 rounded ring-2 ring-primary inline-block shrink-0" />
                  Atual
                </div>
              </div>
            </div>

            {/* Stats no sidebar */}
            <div className="border-t p-3 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Respondidas</span>
                <span className="font-semibold tabular-nums">{answeredCount}/{questions.length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Restantes</span>
                <span className={cn(
                  'font-semibold tabular-nums',
                  questions.length - answeredCount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400',
                )}>
                  {questions.length - answeredCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer — navegação + enviar */}
        <div className="shrink-0 border-t bg-card/95 backdrop-blur px-4 md:px-6 py-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
          <div className="max-w-2xl mx-auto flex items-center gap-4">

            {/* Anterior */}
            <Button
              variant="outline"
              onClick={() => goToQuestion(currentQuestionIndex - 1)}
              disabled={currentQuestionIndex === 0}
              className="h-11 px-5 gap-2 shrink-0"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            {/* Centro: indicador de progresso */}
            <div className="flex-1 flex flex-col items-center gap-0.5">
              <span className="text-sm font-bold tabular-nums text-foreground">
                {currentQuestionIndex + 1} / {questions.length}
              </span>
              <span className={cn(
                'text-xs',
                answeredCount < questions.length
                  ? 'text-amber-600 dark:text-amber-400'
                  : 'text-emerald-600 dark:text-emerald-400',
              )}>
                {answeredCount < questions.length
                  ? `${questions.length - answeredCount} sem resposta`
                  : '✓ Todas respondidas'
                }
              </span>
            </div>

            {/* Próxima ou Enviar */}
            {currentQuestionIndex < questions.length - 1 ? (
              <Button
                onClick={() => goToQuestion(currentQuestionIndex + 1)}
                className="h-11 px-6 gap-2 shrink-0 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white border-0 shadow-md shadow-primary/20"
              >
                Próxima
                <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSubmit()}
                disabled={isSubmitting || answeredCount < questions.length}
                className="h-11 px-6 gap-2 shrink-0 bg-gradient-to-r from-primary to-purple-500 hover:opacity-90 text-white border-0 shadow-md shadow-primary/20 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />Enviando...</>
                ) : (
                  <><Send className="h-4 w-4" />Enviar Prova</>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

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
            <AlertDialogAction
              onClick={() => router.push(`/cursos/${courseId}`)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Sair mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
