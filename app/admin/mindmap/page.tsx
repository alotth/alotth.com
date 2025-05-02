import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default async function MindmapPage() {
  const supabase = createServerComponentClient({ cookies });

  const { data: projects, error } = await supabase
    .from("mindmap_projects")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching projects:", error);
    return <div>Error loading projects</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Mindmaps</h2>
        <Link href="/admin/mindmap/new">
          <Button>Create New Mindmap</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((project) => (
          <Link
            key={project.id}
            href={`/admin/mindmap/${project.id}`}
            className="block p-4 border rounded-lg hover:border-primary transition-colors"
          >
            <h3 className="font-medium mb-2">{project.title}</h3>
            {project.description && (
              <p className="text-sm text-muted-foreground mb-2">
                {project.description}
              </p>
            )}
            <div className="text-xs text-muted-foreground">
              Created {new Date(project.created_at).toLocaleDateString()}
            </div>
          </Link>
        ))}

        {projects?.length === 0 && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No mindmaps yet. Create your first one!
          </div>
        )}
      </div>
    </div>
  );
}
