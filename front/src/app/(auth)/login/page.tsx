import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="relative min-h-svh bg-background flex flex-col justify-center items-center p-4 overflow-hidden">

      {/* ── Radial glow top-center ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(ellipse 65% 45% at 50% -5%, rgba(94,106,210,0.14), transparent 70%)",
        }}
      />

      {/* ── Floating orb 1 — top-left, large ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          top: "8%",
          left: "6%",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(94,106,210,0.09) 0%, transparent 68%)",
          willChange: "transform",
          animation: "floatOrbA 20s ease-in-out infinite",
        }}
      />

      {/* ── Floating orb 2 — bottom-right, medium ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          bottom: "10%",
          right: "4%",
          width: 260,
          height: 260,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(113,112,255,0.08) 0%, transparent 65%)",
          willChange: "transform",
          animation: "floatOrbB 16s ease-in-out infinite",
          animationDelay: "-6s",
        }}
      />

      {/* ── Floating orb 3 — bottom-left, small ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          bottom: "20%",
          left: "3%",
          width: 160,
          height: 160,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(94,106,210,0.07) 0%, transparent 65%)",
          willChange: "transform",
          animation: "floatOrbC 13s ease-in-out infinite",
          animationDelay: "-3s",
        }}
      />

      {/* ── Floating orb 4 — top-right, tiny ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -z-10"
        style={{
          top: "18%",
          right: "8%",
          width: 120,
          height: 120,
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(130,143,255,0.07) 0%, transparent 65%)",
          willChange: "transform",
          animation: "floatOrbA 11s ease-in-out infinite",
          animationDelay: "-9s",
        }}
      />

      {/* ── Form ── */}
      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
