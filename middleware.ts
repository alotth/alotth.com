import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Verificar se o usuário está autenticado
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Se o usuário não estiver autenticado e estiver tentando acessar uma rota protegida
  if (
    !session &&
    req.nextUrl.pathname.startsWith("/admin") &&
    req.nextUrl.pathname !== "/admin/login"
  ) {
    const redirectUrl = new URL("/admin/login", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Se o usuário estiver autenticado e estiver tentando acessar a página de login
  if (session && req.nextUrl.pathname === "/admin/login") {
    const redirectUrl = new URL("/admin", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Retornar a resposta com os cookies atualizados
  return res;
}

export const config = {
  matcher: ["/admin/:path*"],
};
