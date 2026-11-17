"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthContext } from "@/contexts/AuthContext";
import { ShieldX } from "lucide-react";

interface AdminGuardProps {
  children: React.ReactNode;
  requireSuperuser?: boolean;
}

export default function AdminGuard({ children, requireSuperuser = false }: AdminGuardProps) {
  const { user, isAuthenticated } = useAuthContext();
  const router = useRouter();

  const hasAccess = isAuthenticated && (
    requireSuperuser
      ? user?.is_superuser
      : user?.is_staff || user?.is_superuser
  );

  useEffect(() => {
    if (isAuthenticated && !hasAccess) {
      router.replace("/dashboard");
    }
  }, [isAuthenticated, hasAccess, router]);

  if (!isAuthenticated) return null;

  if (!hasAccess) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
        <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
          <ShieldX className="h-7 w-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Acesso restrito</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
