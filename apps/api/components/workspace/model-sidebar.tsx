"use client";

import { useWorkspace } from "./workspace-context";
import { ModelCardViewer } from "./model-card-viewer";

export function ModelSidebar() {
  const { selectedModelCard } = useWorkspace();

  if (!selectedModelCard) {
    return (
      <div className="flex h-full items-center justify-center p-4 text-center">
        <div className="text-sm text-muted-foreground">
          No model card selected. Select a model card from the file explorer.
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ModelCardViewer path={selectedModelCard.path} type={selectedModelCard.type} />
    </div>
  );
}

