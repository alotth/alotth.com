"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { themes, getThemeById } from "@/lib/themes";
import MarkdownRenderer from "@/components/MarkdownRenderer";

interface Proposal {
  id: string;
  title: string;
  content: string | null;
  theme_id: string;
  is_active: boolean;
  share_key: string;
  created_at: string;
  updated_at: string;
}

interface ProposalPageProps {
  params: {
    id: string;
  };
}

export default function ProposalPage({ params }: ProposalPageProps) {
  const router = useRouter();
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);

  const fetchProposal = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .eq("id", params.id)
        .single();

      if (error) throw error;
      setProposal(data);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar proposta");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    if (params.id !== "new") {
      fetchProposal();
    } else {
      setLoading(false);
    }
  }, [params.id, fetchProposal]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const proposalData = {
      title: formData.get("title") as string,
      content: formData.get("content") as string,
      theme_id: formData.get("theme_id") as string,
      is_active: formData.get("is_active") === "true",
    };

    try {
      if (params.id === "new") {
        const { data, error } = await supabase
          .from("proposals")
          .insert([{ ...proposalData, share_key: crypto.randomUUID() }])
          .select()
          .single();

        if (error) throw error;
        router.push(`/admin/proposals/${data.id}`);
      } else {
        const { error } = await supabase
          .from("proposals")
          .update(proposalData)
          .eq("id", params.id);

        if (error) throw error;
        fetchProposal();
      }
    } catch (err: any) {
      setError(err.message || "Erro ao salvar proposta");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">
          {params.id === "new" ? "Nova Proposta" : "Editar Proposta"}
        </h1>
        <button
          onClick={() => setPreview(!preview)}
          className="text-primary hover:text-primary/80"
        >
          {preview ? "Editar" : "Visualizar"}
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {preview && proposal ? (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-2xl font-bold mb-4">{proposal.title}</h2>
          <MarkdownRenderer
            content={proposal.content}
            theme={getThemeById(proposal.theme_id)}
          />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700"
            >
              Título
            </label>
            <input
              type="text"
              name="title"
              id="title"
              defaultValue={proposal?.title}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            />
          </div>

          <div>
            <label
              htmlFor="theme_id"
              className="block text-sm font-medium text-gray-700"
            >
              Tema
            </label>
            <select
              name="theme_id"
              id="theme_id"
              defaultValue={proposal?.theme_id}
              required
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary"
            >
              <option value="">Selecione um tema</option>
              {Object.entries(themes).map(([id, theme]) => (
                <option key={id} value={id}>
                  {theme.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="content"
              className="block text-sm font-medium text-gray-700"
            >
              Conteúdo (Markdown)
            </label>
            <textarea
              name="content"
              id="content"
              defaultValue={proposal?.content ?? ""}
              required
              rows={20}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary font-mono"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              name="is_active"
              id="is_active"
              defaultChecked={proposal?.is_active ?? true}
              value="true"
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label
              htmlFor="is_active"
              className="ml-2 block text-sm text-gray-700"
            >
              Proposta ativa
            </label>
          </div>

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
