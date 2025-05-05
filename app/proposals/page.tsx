import { supabase } from "@/lib/supabase/client";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import { getThemeById } from "@/lib/themes";

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
  searchParams: {
    id?: string;
    share_key?: string;
  };
}

export default async function ProposalPage({
  searchParams,
}: ProposalPageProps) {
  const { id, share_key } = searchParams;

  if (!id && !share_key) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="text-center p-8 bg-black/50 backdrop-blur-sm rounded-lg border border-valorant-500/20">
          <h1 className="text-2xl font-bold mb-4 text-white">
            Proposta não encontrada
          </h1>
          <p className="text-gray-400">
            Esta proposta não existe ou não está disponível.
          </p>
        </div>
      </div>
    );
  }

  // Buscar a proposta pelo ID ou share_key
  const query = supabase.from("proposals").select("*").eq("is_active", true);

  if (id) {
    query.eq("id", id);
  } else if (share_key) {
    query.eq("share_key", share_key);
  }

  const { data: proposal, error } = await query.single();

  if (error || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-900 to-black">
        <div className="text-center p-8 bg-black/50 backdrop-blur-sm rounded-lg border border-valorant-500/20">
          <h1 className="text-2xl font-bold mb-4 text-white">
            Proposta não encontrada
          </h1>
          <p className="text-gray-400">
            Esta proposta não existe ou não está disponível.
          </p>
        </div>
      </div>
    );
  }

  // Obter o tema da proposta
  const theme = getThemeById(proposal.theme_id);

  return (
    <div className="min-h-screen py-8 bg-gradient-to-br from-black via-gray-900 to-black relative">
      <div className="absolute inset-0 bg-[url('/hexagrid.svg')] opacity-10"></div>
      <div className="relative max-w-4xl mx-auto px-4">
        <MarkdownRenderer content={proposal.content} theme={theme} />
      </div>
    </div>
  );
}
