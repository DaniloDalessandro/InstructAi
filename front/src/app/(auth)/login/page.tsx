import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <div className="relative min-h-svh bg-background flex flex-col justify-center items-center p-4 overflow-hidden">
      {/* Subtle radial glow */}
      <div
        className="pointer-events-none absolute inset-0 -z-0"
        style={{
          background: "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(94,106,210,0.12), transparent 70%)",
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
