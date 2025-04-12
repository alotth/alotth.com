"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase/config";
import { themes } from "@/lib/themes";
import Link from "next/link";

interface Proposal {
  id: string;
  title: string;
  theme_id: string;
  created_at: string;
  updated_at: string;
  share_key: string;
  is_active: boolean;
}

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchProposals();
  }, []);

  const fetchProposals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("proposals")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProposals(data || []);
    } catch (err: any) {
      setError(err.message || "Error loading proposals");
    } finally {
      setLoading(false);
    }
  };

  const toggleActive = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from("proposals")
        .update({ is_active: !currentStatus })
        .eq("id", id);

      if (error) throw error;
      fetchProposals();
    } catch (err: any) {
      setError(err.message || "Error updating proposal status");
    }
  };

  const copyShareLink = (shareKey: string) => {
    const url = `${window.location.origin}/proposals?share_key=${shareKey}`;
    navigator.clipboard.writeText(url);
    alert("Link copied to clipboard!");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
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
        <h1 className="text-2xl font-bold">Manage Proposals</h1>
        <Link
          href="/admin/proposals/new"
          className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/90"
        >
          New Proposal
        </Link>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-red-100 text-red-700 rounded-md">
          {error}
        </div>
      )}

      {proposals.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">No proposals found.</p>
          <Link
            href="/admin/proposals/new"
            className="mt-4 inline-block text-primary hover:underline"
          >
            Create your first proposal
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Title
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Theme
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {proposals.map((proposal) => (
                <tr key={proposal.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {proposal.title}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {proposal.theme_id || "unknown"}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">
                      {formatDate(proposal.created_at)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        proposal.is_active
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {proposal.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <Link
                        href={`/admin/proposals/${proposal.id}`}
                        className="text-primary hover:text-primary/80"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() =>
                          toggleActive(proposal.id, proposal.is_active)
                        }
                        className="text-gray-600 hover:text-gray-900"
                      >
                        {proposal.is_active ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => copyShareLink(proposal.share_key)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        Share
                      </button>
                      <Link
                        href={`/proposals/?share_key=${proposal.share_key}`}
                        className="text-red-600 hover:text-red-800"
                        target="_blank"
                      >
                        View Proposal
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
