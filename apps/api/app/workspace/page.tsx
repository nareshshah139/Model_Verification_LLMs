"use client";

import { ResizableShell } from "@/components/workspace/resizable-shell";
import { FileExplorer } from "@/components/workspace/file-explorer";
import { ModelSidebar } from "@/components/workspace/model-sidebar";
import { CenterTabs } from "@/components/workspace/center-tabs";
import { SuperTabs } from "@/components/workspace/super-tabs";
import { WorkspaceProvider } from "@/components/workspace/workspace-context";

export default function WorkspacePage() {
  return (
    <div className="w-full">
    <WorkspaceProvider>
      <ResizableShell
        left={<FileExplorer />}
        center={
          <div className="flex h-full flex-col">
            {/* superseding tab above the middle tab */}
            <SuperTabs />
            <CenterTabs />
          </div>
        }
        right={<ModelSidebar />}
      />
    </WorkspaceProvider>
    </div>
  );
}

