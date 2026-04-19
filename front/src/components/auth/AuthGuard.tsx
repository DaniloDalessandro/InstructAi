"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { jwtDecode } from "jwt-decode";

interface AuthGuardProps {
  children: React.ReactNode;
}

interface JWTPayload {
  exp: number;
  user_id: number;
}

// Valida sincroniamente se o token JWT ainda é válido
function isTokenValidSync(token: string): boolean {
  try {
    const decoded = jwtDecode<JWTPayload>(token);
    const now = Math.floor(Date.now() / 1000);
    return decoded.exp > now;
  } catch {
    return false;
  }
}

// Limpa completamente a sessão local
function clearSession() {
  localStorage.removeItem("access");
  localStorage.removeItem("refresh");
  document.cookie = "access=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "refresh=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
}

// Lê um cookie pelo nome
function getCookieValue(name: string): string | null {
  const match = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : null;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, accessToken, logout } = useAuthContext();
  const router = useRouter();
  const [isValidated, setIsValidated] = useState(false);

  const handleForceLogout = useCallback(async () => {
    clearSession();
    await logout();
    router.replace('/login');
  }, [logout, router]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      // Verificar token no cookie (fonte de verdade)
      const cookieToken = getCookieValue("access");
      const cookieRefresh = getCookieValue("refresh");

      // Sem nenhum token — forçar logout
      if (!cookieToken && !cookieRefresh) {
        await handleForceLogout();
        return;
      }

      // Token de acesso presente e válido
      if (cookieToken && isTokenValidSync(cookieToken)) {
        setIsValidated(true);
        return;
      }

      // Token de acesso inválido mas há refresh válido — aguardar renovação pelo authFetch
      if (!cookieToken && cookieRefresh && isTokenValidSync(cookieRefresh)) {
        setIsValidated(true);
        return;
      }

      // Nenhum token válido — forçar logout
      await handleForceLogout();
    }, 200);

    return () => clearTimeout(timer);
  }, [accessToken, handleForceLogout]);

  // Exibir spinner enquanto valida
  if (!isValidated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Verificando autenticação...</p>
        </div>
      </div>
    );
  }

  // Token válido — renderizar conteúdo protegido
  const cookieToken = typeof window !== 'undefined' ? getCookieValue("access") : null;
  if (cookieToken && isTokenValidSync(cookieToken)) {
    return <>{children}</>;
  }

  // Fallback de segurança
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <p className="text-muted-foreground">Redirecionando para login...</p>
      </div>
    </div>
  );
}
