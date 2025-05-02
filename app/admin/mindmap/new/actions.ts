"use server";

import { createServerActionClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function createProject(formData: FormData) {
  const cookieStore = cookies();
  const supabase = createServerActionClient({ cookies: () => cookieStore });

  // Verificar se o usuário está autenticado
  const {
    data: { session },
    error: authError,
  } = await supabase.auth.getSession();

  if (authError || !session) {
    console.error("Erro de autenticação:", authError);
    redirect("/admin/login");
  }

  const title = formData.get("title") as string;
  const description = formData.get("description") as string;

  // Incluir o user_id no objeto de inserção
  const { data: project, error } = await supabase
    .from("mindmap_projects")
    .insert([
      {
        title,
        description,
        user_id: session.user.id, // Adicionar o ID do usuário
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("Error creating project:", error);
    return;
  }

  redirect(`/admin/mindmap/${project.id}`);
}
