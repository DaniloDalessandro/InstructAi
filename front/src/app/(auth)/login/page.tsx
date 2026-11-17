import { LoginForm } from "@/components/auth/login-form"
import { GraduationCap, BookText, Award, Sparkles } from "lucide-react"

export default function LoginPage() {
  const features = [
    {
      Icon: GraduationCap,
      label: "Tutoriais interativos",
      desc: "Passo a passo com vídeo e imagens",
    },
    {
      Icon: BookText,
      label: "Manuais em PDF",
      desc: "Documentação organizada por setor",
    },
    {
      Icon: Award,
      label: "Cursos com certificado",
      desc: "Trilhas de aprendizagem e provas finais",
    },
  ]

  return (
    <div className="min-h-svh flex overflow-hidden">

      {/* ════════════════════════════════════════
          LEFT — Brand panel (desktop only)
          ════════════════════════════════════════ */}
      <aside
        className="hidden lg:flex flex-col justify-between relative w-[460px] xl:w-[520px] overflow-hidden p-10 select-none"
        style={{
          background:
            "linear-gradient(155deg, #06071a 0%, #0d0b30 35%, #180f4a 65%, #0b0920 100%)",
        }}
      >
        {/* Dot grid overlay */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(255,255,255,0.032) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />

        {/* Glowing orb — center-left */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "15%", left: "10%",
            width: 420, height: 420,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(94,106,210,0.14) 0%, transparent 65%)",
            animation: "floatOrbA 22s ease-in-out infinite",
          }}
        />

        {/* Glowing orb — bottom-right */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            bottom: "2%", right: "-15%",
            width: 340, height: 340,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.11) 0%, transparent 65%)",
            animation: "floatOrbB 18s ease-in-out infinite",
            animationDelay: "-7s",
          }}
        />

        {/* Horizontal light beam */}
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            top: "38%", left: 0, right: 0, height: 1,
            background:
              "linear-gradient(90deg, transparent 0%, rgba(94,106,210,0.22) 38%, rgba(124,58,237,0.18) 62%, transparent 100%)",
          }}
        />

        {/* ── Logo ── */}
        <div
          className="relative z-10 flex items-center gap-3"
          style={{ opacity: 0, animation: "panelSlideIn 0.65s ease-out 0.05s forwards" }}
        >
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
            style={{
              background: "linear-gradient(135deg, #5e6ad2 0%, #7c3aed 100%)",
              boxShadow: "0 4px 16px rgba(94,106,210,0.4)",
            }}
          >
            <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5">
              <polygon points="32,11 55,23 32,35 9,23" fill="white" fillOpacity="0.95" />
              <path d="M19,27.5 L19,40 Q32,48.5 45,40 L45,27.5 L32,33.5 Z" fill="white" fillOpacity="0.85" />
              <line x1="55" y1="23" x2="55" y2="37" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
              <circle cx="55" cy="39.5" r="3" fill="white" opacity="0.85" />
            </svg>
          </div>
          <span
            className="font-semibold text-white text-[17px]"
            style={{ letterSpacing: "-0.3px" }}
          >
            InstructAI
          </span>
        </div>

        {/* ── Main headline ── */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-10">
          <div
            style={{ opacity: 0, animation: "panelSlideIn 0.65s ease-out 0.2s forwards" }}
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium mb-7"
              style={{
                background: "rgba(94,106,210,0.13)",
                color: "#8b97f5",
                border: "1px solid rgba(94,106,210,0.22)",
              }}
            >
              <Sparkles className="w-3 h-3" />
              Gestão de conhecimento com IA
            </div>

            <h2
              className="text-[2rem] xl:text-[2.25rem] font-semibold text-white leading-[1.2]"
              style={{ letterSpacing: "-0.5px" }}
            >
              Centralize o saber<br />da sua organização
            </h2>
            <p
              className="mt-4 text-[14px] leading-relaxed max-w-[320px]"
              style={{ color: "rgba(255,255,255,0.42)" }}
            >
              Tutoriais, manuais, cursos e certificações. Tudo em um único lugar,
              acessível com inteligência artificial.
            </p>
          </div>

          {/* Feature list */}
          <div className="mt-10 space-y-4">
            {features.map(({ Icon, label, desc }, i) => (
              <div
                key={label}
                className="flex items-start gap-3"
                style={{
                  opacity: 0,
                  animation: `featureIn 0.5s ease-out ${0.38 + i * 0.1}s forwards`,
                }}
              >
                <div
                  className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center mt-0.5"
                  style={{
                    background: "rgba(94,106,210,0.1)",
                    border: "1px solid rgba(94,106,210,0.18)",
                  }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: "#8b97f5" }} />
                </div>
                <div>
                  <p
                    className="text-[13px] font-medium leading-none"
                    style={{ color: "rgba(255,255,255,0.82)" }}
                  >
                    {label}
                  </p>
                  <p
                    className="text-[12px] mt-1"
                    style={{ color: "rgba(255,255,255,0.33)" }}
                  >
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom trust row ── */}
        <div
          className="relative z-10 flex items-center gap-2.5"
          style={{
            opacity: 0,
            animation: "panelSlideIn 0.65s ease-out 0.7s forwards",
          }}
        >
          <div className="flex -space-x-1.5">
            {["#5e6ad2", "#7c3aed", "#4338ca", "#6d28d9"].map((color, i) => (
              <div
                key={i}
                className="w-6 h-6 rounded-full ring-2"
                style={{
                  background: `radial-gradient(circle at 35% 35%, ${color}cc, ${color})`,
                  boxShadow: `0 0 0 2px #06071a`,
                }}
              />
            ))}
          </div>
          <span
            className="text-[11px]"
            style={{ color: "rgba(255,255,255,0.28)" }}
          >
            Uma solução inteligente para equipes inteligentes
          </span>
        </div>
      </aside>

      {/* ════════════════════════════════════════
          RIGHT — Form panel
          ════════════════════════════════════════ */}
      <main className="flex-1 flex flex-col items-center justify-center relative p-6 sm:p-10 overflow-hidden bg-background">
        {/* Subtle top glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(ellipse 70% 45% at 50% -5%, rgba(94,106,210,0.07), transparent 70%)",
          }}
        />

        {/* Floating orbs — right panel (subtle) */}
        <div
          aria-hidden
          className="pointer-events-none absolute -z-10"
          style={{
            bottom: "8%", right: "5%",
            width: 220, height: 220,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 65%)",
            animation: "floatOrbB 20s ease-in-out infinite",
            animationDelay: "-4s",
          }}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -z-10"
          style={{
            top: "10%", left: "3%",
            width: 160, height: 160,
            borderRadius: "50%",
            background:
              "radial-gradient(circle, rgba(94,106,210,0.05) 0%, transparent 65%)",
            animation: "floatOrbC 15s ease-in-out infinite",
            animationDelay: "-9s",
          }}
        />

        <LoginForm />
      </main>
    </div>
  )
}
