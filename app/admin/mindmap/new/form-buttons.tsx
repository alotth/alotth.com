"use client";

import { Button } from "@/components/ui/button";

export function FormButtons() {
  return (
    <div className="flex justify-end space-x-4">
      <Button
        type="button"
        variant="outline"
        onClick={() => window.history.back()}
      >
        Cancel
      </Button>
      <Button type="submit">Create Mindmap</Button>
    </div>
  );
}
