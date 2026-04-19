"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  HelpCircle,
  BookOpen,
  FileText,
  GraduationCap,
  Building2,
  Tag,
  Bot,
  Search,
  ChevronRight,
  BarChart3,
  PlayCircle,
  CheckCircle,
  Clock,
  Lightbulb,
  MessageSquare,
} from "lucide-react"

interface HelpTopic {
  id: string
  title: string
  description: string
  category: string
  level: "Básico" | "Intermediário" | "Avançado"
  duration: string
  icon: React.ComponentType<{ className?: string }>
  steps: string[]
  tips?: string[]
}

interface FAQ {
  question: string
  answer: string
  category: string
}

const TOPICS: HelpTopic[] = [
  {
    id: "dashboard",
    title: "Visão Geral do Dashboard",
    description: "Entenda as métricas e gráficos do painel principal",
    category: "Dashboard",
    level: "Básico",
    duration: "3 min",
    icon: BarChart3,
    steps: [
      "Acesse o Dashboard pelo menu lateral",
      "Veja os cards de KPI: total de tutoriais, passos, manuais e cursos",
      "Analise o gráfico de tutoriais por setor",
      "Confira o gráfico de distribuição de conteúdo por tipo",
      "Use a lista de tutoriais recentes para acessar rapidamente",
    ],
    tips: [
      "Clique nos cards de KPI para ir diretamente ao módulo",
      "Os dados são carregados em tempo real ao abrir a página",
    ],
  },
  {
    id: "tutoriais-criar",
    title: "Criar um Tutorial",
    description: "Como criar tutoriais passo a passo com imagens e vídeos",
    category: "Tutoriais",
    level: "Básico",
    duration: "8 min",
    icon: BookOpen,
    steps: [
      "Acesse o módulo 'Tutoriais' no menu lateral",
      "Clique em 'Novo Tutorial'",
      "Preencha título, descrição, setor e tags",
      "Salve o tutorial para liberar a edição dos passos",
      "Adicione passos com título e conteúdo rico (texto, formatação)",
      "Em cada passo, anexe imagens ou incorpore vídeos do YouTube",
      "Reordene os passos arrastando ou ajustando a ordem",
      "Ative o tutorial para torná-lo visível para todos",
    ],
    tips: [
      "Use tags para facilitar a busca por tema",
      "Imagens podem ter anotações destacando pontos importantes",
      "O tutorial pode ser baixado em PDF pelo botão na tela de visualização",
    ],
  },
  {
    id: "tutoriais-visualizar",
    title: "Visualizar e Navegar em Tutoriais",
    description: "Como consumir tutoriais passo a passo",
    category: "Tutoriais",
    level: "Básico",
    duration: "3 min",
    icon: BookOpen,
    steps: [
      "Acesse 'Tutoriais' e clique no tutorial desejado",
      "Use a barra lateral esquerda para navegar entre os passos",
      "Role a página para ler os passos em sequência",
      "Clique em 'Baixar PDF' para salvar o tutorial",
      "Usuários com permissão podem editar pelo botão 'Editar'",
    ],
  },
  {
    id: "manuais",
    title: "Gerenciar Manuais",
    description: "Publicar e organizar documentos PDF por setor",
    category: "Manuais",
    level: "Básico",
    duration: "5 min",
    icon: FileText,
    steps: [
      "Acesse 'Manuais' no menu lateral",
      "Clique em 'Novo Manual'",
      "Preencha título, descrição e selecione o setor",
      "Faça upload do arquivo PDF",
      "Salve — o manual ficará disponível imediatamente",
      "Para editar ou excluir, use o menu de ações na listagem",
    ],
    tips: [
      "PDFs são organizados por setor para facilitar a busca",
      "O visualizador integrado permite leitura sem download",
    ],
  },
  {
    id: "cursos",
    title: "Cursos e Certificados",
    description: "Criar trilhas de aprendizado com provas e certificados automáticos",
    category: "Cursos",
    level: "Intermediário",
    duration: "12 min",
    icon: GraduationCap,
    steps: [
      "Acesse 'Cursos' e clique em 'Novo Curso'",
      "Preencha título, descrição e capa do curso",
      "Adicione aulas com vídeo, texto ou material de apoio",
      "Configure a prova: número de questões, nota mínima e tempo limite",
      "Adicione questões de múltipla escolha com gabarito",
      "Publique o curso para os usuários se matricularem",
      "Acompanhe o progresso de cada aluno na tela do curso",
      "Certificados são gerados automaticamente após aprovação na prova",
    ],
    tips: [
      "A nota mínima padrão é 70% — ajuste conforme necessário",
      "Alunos podem refazer a prova quantas vezes for permitido",
      "Certificados ficam disponíveis para download no perfil do aluno",
    ],
  },
  {
    id: "setores-tags",
    title: "Setores e Tags",
    description: "Organizar a base de conhecimento com setores e marcadores",
    category: "Organização",
    level: "Básico",
    duration: "4 min",
    icon: Building2,
    steps: [
      "Acesse 'Configurações' > 'Setores' para gerenciar unidades organizacionais",
      "Crie setores que representem departamentos ou áreas da empresa",
      "Acesse 'Configurações' > 'Tags' para criar marcadores temáticos",
      "Defina uma cor para cada tag para identificação visual",
      "Ao criar tutoriais e manuais, associe ao setor e às tags relevantes",
      "Use os filtros na listagem para encontrar conteúdo por setor ou tag",
    ],
    tips: [
      "Setores ativos aparecem como opção ao criar conteúdo",
      "Tags com cores distintas facilitam a identificação visual",
    ],
  },
  {
    id: "alice",
    title: "Falar com a Alice — Assistente IA",
    description: "Como usar a assistente inteligente para consultar dados e tirar dúvidas",
    category: "Alice",
    level: "Básico",
    duration: "5 min",
    icon: Bot,
    steps: [
      "Clique em 'Fale com Alice' no menu lateral",
      "Digite sua pergunta em linguagem natural",
      "Alice consultará os dados reais da plataforma quando necessário",
      "Leia a resposta — ela pode incluir listas, análises e sugestões",
      "Continue a conversa com perguntas de acompanhamento",
      "Use 'Nova Conversa' para iniciar um contexto diferente",
    ],
    tips: [
      "Exemplos: 'Quantos tutoriais temos?', 'Me mostre cursos de TI', 'Quais setores estão cadastrados?'",
      "Alice lembra o contexto da conversa atual",
      "Seja específico para respostas mais precisas",
    ],
  },
]

const FAQS: FAQ[] = [
  {
    question: "Como alterar minha senha?",
    answer: "Clique no seu avatar no canto inferior esquerdo da barra lateral, acesse 'Perfil' e use a seção de segurança para definir uma nova senha.",
    category: "Conta",
  },
  {
    question: "Quem pode editar ou excluir conteúdo?",
    answer: "O criador do conteúdo e administradores (superusuários) podem editar e excluir. Usuários comuns só gerenciam o que criaram.",
    category: "Permissões",
  },
  {
    question: "Como baixar um tutorial em PDF?",
    answer: "Abra o tutorial desejado e clique no botão 'Baixar PDF' no cabeçalho. O PDF é gerado com todos os passos e formatação preservados.",
    category: "Tutoriais",
  },
  {
    question: "O sistema funciona no celular?",
    answer: "Sim, o InstructAI é responsivo e funciona em dispositivos móveis. Recomendamos navegadores atualizados para melhor experiência.",
    category: "Técnico",
  },
  {
    question: "Como funciona o certificado do curso?",
    answer: "Após concluir todas as aulas e ser aprovado na prova (nota mínima configurada pelo criador), o certificado é gerado automaticamente em PDF e fica disponível no seu perfil.",
    category: "Cursos",
  },
  {
    question: "Alice não respondeu corretamente, o que fazer?",
    answer: "Tente reformular a pergunta com mais detalhes. Para perguntas sobre dados específicos, inclua o nome do setor, tag ou título. Use 'Nova Conversa' se o contexto anterior estiver confundindo a resposta.",
    category: "Alice",
  },
  {
    question: "Como organizar tutoriais por área?",
    answer: "Crie setores representando seus departamentos (ex: TI, RH, Financeiro) e associe cada tutorial ao setor correspondente. Use tags para subcategorias temáticas.",
    category: "Organização",
  },
  {
    question: "É possível incorporar vídeos do YouTube nos tutoriais?",
    answer: "Sim. Na edição de um passo, selecione a aba 'Vídeo', cole a URL do YouTube e o vídeo será incorporado diretamente no passo.",
    category: "Tutoriais",
  },
]

const CATEGORIES = ["Todos", "Dashboard", "Tutoriais", "Manuais", "Cursos", "Organização", "Alice"]

const LEVEL_COLORS: Record<string, string> = {
  "Básico": "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  "Intermediário": "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  "Avançado": "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
}

export default function AjudaPage() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("Todos")
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null)

  const filteredTopics = TOPICS.filter((t) => {
    const matchSearch =
      t.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchCategory = selectedCategory === "Todos" || t.category === selectedCategory
    return matchSearch && matchCategory
  })

  const filteredFAQs = FAQS.filter(
    (f) =>
      f.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      f.answer.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-5 max-w-7xl animate-fade-in">

      {/* Cabeçalho padronizado */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <HelpCircle className="h-6 w-6 text-blue-600 shrink-0" />
          Central de Ajuda
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">Guias, tutoriais e perguntas frequentes do InstructAI</p>
      </div>

      {/* Busca e filtros de categoria */}
      <div className="flex flex-col gap-3 p-4 rounded-xl border border-border/60 bg-muted/20">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por tópico, módulo ou dúvida..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-background"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {CATEGORIES.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              className="h-7 text-xs rounded-full"
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </Button>
          ))}
        </div>
      </div>

      {/* Início rápido */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <PlayCircle className="h-4 w-4 text-green-600" />
            Início Rápido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Primeiros passos
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Faça login com as credenciais fornecidas pelo administrador</li>
                <li>• Explore o Dashboard para ter uma visão geral do conteúdo</li>
                <li>• Configure seu perfil em Configurações</li>
                <li>• Crie seu primeiro tutorial ou manual</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                Dicas importantes
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1 ml-6">
                <li>• Organize tutoriais por setor e tags para facilitar a busca</li>
                <li>• Use a Alice para consultar dados rapidamente</li>
                <li>• Tutoriais podem ser exportados em PDF a qualquer momento</li>
                <li>• Cursos geram certificados automáticos após aprovação</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-3 gap-6">

        {/* Guias por módulo */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            Guias por Módulo
          </h2>

          {filteredTopics.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-sm text-muted-foreground">
                <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
                Nenhum guia encontrado para sua pesquisa.
              </CardContent>
            </Card>
          ) : (
            filteredTopics.map((topic) => (
              <Card key={topic.id} className="hover:border-primary/30 hover:shadow-sm transition-all duration-150 border-border/60">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <topic.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-semibold text-sm">{topic.title}</h3>
                          <p className="text-xs text-muted-foreground mt-0.5">{topic.description}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 shrink-0"
                          onClick={() =>
                            setExpandedTopic(expandedTopic === topic.id ? null : topic.id)
                          }
                        >
                          <ChevronRight
                            className={`h-4 w-4 transition-transform ${
                              expandedTopic === topic.id ? "rotate-90" : ""
                            }`}
                          />
                        </Button>
                      </div>

                      <div className="flex flex-wrap gap-1.5 mt-2">
                        <Badge className={`text-xs ${LEVEL_COLORS[topic.level]}`}>
                          {topic.level}
                        </Badge>
                        <Badge variant="outline" className="text-xs flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {topic.duration}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{topic.category}</Badge>
                      </div>

                      {expandedTopic === topic.id && (
                        <div className="mt-4 pt-4 border-t space-y-3">
                          <ol className="space-y-2">
                            {topic.steps.map((step, i) => (
                              <li key={i} className="flex gap-3 text-sm">
                                <span className="shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                                  {i + 1}
                                </span>
                                <span className="text-muted-foreground">{step}</span>
                              </li>
                            ))}
                          </ol>

                          {topic.tips && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                                <Lightbulb className="h-3.5 w-3.5 text-yellow-600" />
                                Dicas
                              </p>
                              <ul className="text-xs text-muted-foreground space-y-1">
                                {topic.tips.map((tip, i) => (
                                  <li key={i}>• {tip}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* FAQ */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Perguntas Frequentes
          </h2>

          <Card>
            <CardContent className="p-4 space-y-1">
              {filteredFAQs.map((faq, i) => (
                <div key={i} className="border-b last:border-0 py-2 last:pb-0 first:pt-0">
                  <button
                    className="w-full text-left flex items-start gap-2 group"
                    onClick={() =>
                      setExpandedFAQ(expandedFAQ === `faq-${i}` ? null : `faq-${i}`)
                    }
                  >
                    <ChevronRight
                      className={`h-4 w-4 shrink-0 mt-0.5 text-muted-foreground transition-transform ${
                        expandedFAQ === `faq-${i}` ? "rotate-90" : ""
                      }`}
                    />
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {faq.question}
                    </span>
                  </button>

                  {expandedFAQ === `faq-${i}` && (
                    <div className="ml-6 mt-2 space-y-1.5">
                      <p className="text-sm text-muted-foreground">{faq.answer}</p>
                      <Badge variant="outline" className="text-xs">{faq.category}</Badge>
                    </div>
                  )}
                </div>
              ))}

              {filteredFAQs.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhuma pergunta encontrada.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Contato */}
          <Card>
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold mb-2">Ainda com dúvidas?</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Use a Alice para perguntas sobre dados e funcionalidades do sistema.
              </p>
              <Button size="sm" className="w-full" asChild>
                <a href="/alice">
                  <Bot className="mr-2 h-4 w-4" />
                  Falar com a Alice
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
