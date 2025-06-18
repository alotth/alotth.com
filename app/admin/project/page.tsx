"use client";

import { cookies } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { deleteMindmapProject, getMindmapProjects } from "@/lib/mindmap";
import { useState } from "react";
import { useEffect } from "react";
import { MindmapProject } from "@/types/mindmap";

export default function MindmapPage() {
  const [projects, setProjects] = useState<MindmapProject[]>([]);

  useEffect(() => {
    const fetchProjects = async () => {
      const projects = await getMindmapProjects();
      setProjects(projects);
    };
    fetchProjects();
  }, []);
  
  const deleteProject = async (id: string) => {
    try {
      await deleteMindmapProject(id);
      setProjects(projects.filter((project) => project.id !== id));
    } catch (error) {
      console.error("Error deleting project:", error);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Mindmap</h1>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Your Projects</h2>
        <Link href="/admin/project/new">
          <Button>Create New Project</Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {projects?.map((project) => (
          <div
            key={project.id}
            className="block p-4 border rounded-lg hover:border-primary transition-colors"
          >
            <Link href={`/admin/project/${project.id}`} className="block">
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
            <Button 
              variant="destructive" 
              onClick={() => deleteProject(project.id)}
              className="mt-2"
            >
              Delete
            </Button>
          </div>
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
