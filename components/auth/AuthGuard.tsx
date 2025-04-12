"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase/config";

function AuthGuardContent({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        // Verifica se é uma proposta compartilhada
        const isSharedProposal =
          pathname?.startsWith("/proposals") && searchParams?.has("share_key");

        if (!session && !isSharedProposal) {
          // Se não estiver autenticado e não for uma proposta compartilhada, redireciona
          if (pathname !== "/admin/login") {
            router.push("/admin/login");
          }
          setIsAuthenticated(false);
          return;
        }

        if (session && pathname == "/admin/login") {
          setIsAuthenticated(true);
          router.push("/admin");
        }
      } catch (error) {
        console.error("Erro ao verificar autenticação:", error);
        router.push("/admin/login");
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Inscrever para mudanças de autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT") {
          setIsAuthenticated(false);
          router.push("/admin/login");
        } else if (event === "SIGNED_IN") {
          setIsAuthenticated(true);
          checkAuth();
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router, pathname, searchParams]);

  // Handle redirects in a separate useEffect
  useEffect(() => {
    if (!isLoading && !isAuthenticated && pathname !== "/admin/login") {
      router.push("/admin/login");
    }
  }, [isLoading, isAuthenticated, pathname, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-section">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se estiver na página de login, não precisa verificar autenticação
  if (pathname === "/admin/login") {
    return <>{children}</>;
  }

  // Se não estiver autenticado, mostra loading enquanto o useEffect faz o redirecionamento
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center admin-section">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Se estiver autenticado, renderiza o conteúdo
  return <>{children}</>;
}

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center admin-section">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      }
    >
      <AuthGuardContent>{children}</AuthGuardContent>
    </Suspense>
  );
}
