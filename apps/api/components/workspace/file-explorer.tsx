"use client";

import { useEffect, useState } from "react";
import { useWorkspace } from "./workspace-context";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Folder, 
  FileCode2, 
  FileJson2, 
  FileType2, 
  FileText,
  ChevronRight,
  ChevronDown,
  Home,
  FolderOpen
} from "lucide-react";

type FileEntry = {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modified: string;
  extension: string | null;
};

type DirectoryData = {
  currentPath: string;
  parentPath: string;
  canGoUp: boolean;
  files: FileEntry[];
};

// Quick access folders
const QUICK_ACCESS = [
  {
    name: "Lending Club",
    path: "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/Lending-Club-Credit-Scoring",
  },
  {
    name: "Model Cards",
    path: "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/apps/api/public/model-cards",
  },
  {
    name: "Services",
    path: "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks/services/codeact_cardcheck",
  },
];

export function FileExplorer() {
  const { openItem, selectModelCard } = useWorkspace();
  const [directoryData, setDirectoryData] = useState<DirectoryData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const loadDirectory = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/files?path=${encodeURIComponent(path)}`);
      if (!response.ok) {
        throw new Error("Failed to load directory");
      }
      const data: DirectoryData = await response.json();
      setDirectoryData(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load directory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Load the Lending Club repository by default
    loadDirectory(QUICK_ACCESS[0].path);
  }, []);

  const handleFileClick = (file: FileEntry) => {
    if (file.isDirectory) {
      loadDirectory(file.path);
    } else {
      const ext = file.extension?.toLowerCase();
      if (ext === "ipynb") {
        openItem({ kind: "notebook", payload: { path: file.path } });
      } else if (ext === "py") {
        openItem({ kind: "python", payload: { path: file.path } });
      } else if (ext === "md") {
        selectModelCard({ path: file.path, type: "markdown" });
      } else if (ext === "docx") {
        selectModelCard({ path: file.path, type: "docx" });
      }
    }
  };

  const getFileIcon = (file: FileEntry) => {
    if (file.isDirectory) return Folder;
    const ext = file.extension?.toLowerCase();
    if (ext === "py") return FileCode2;
    if (ext === "ipynb") return FileJson2;
    if (ext === "md" || ext === "docx") return FileText;
    if (ext === "json") return FileType2;
    return FileType2;
  };

  return (
    <div className="flex h-full flex-col">
      <div className="px-3 py-2">
        <div className="text-xs uppercase text-muted-foreground mb-2">Quick Access</div>
        <div className="space-y-1">
          {QUICK_ACCESS.map((folder) => (
            <Button
              key={folder.path}
              variant="ghost"
              size="sm"
              className="w-full justify-start text-xs h-7"
              onClick={() => loadDirectory(folder.path)}
            >
              <Home className="h-3 w-3 mr-2" />
              {folder.name}
            </Button>
          ))}
        </div>
      </div>
      <Separator />
      
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="text-xs uppercase text-muted-foreground">Browser</div>
        {directoryData?.canGoUp && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => loadDirectory(directoryData.parentPath)}
          >
            ↑ Up
          </Button>
        )}
      </div>
      
      <Separator />
      
      {loading && (
        <div className="flex items-center justify-center p-4 text-sm text-muted-foreground">
          Loading...
        </div>
      )}
      
      {error && (
        <div className="p-4 text-sm text-destructive">
          {error}
        </div>
      )}
      
      {!loading && !error && directoryData && (
        <ScrollArea className="flex-1">
          <div className="space-y-0.5 p-2">
            {directoryData.files.map((file) => {
              const Icon = getFileIcon(file);
              const isExpandable = file.isDirectory;
              
              return (
                <Button
                  key={file.path}
                  variant="ghost"
                  className="w-full justify-start px-2 h-8 font-normal"
                  onClick={() => handleFileClick(file)}
                >
                  <Icon className="h-4 w-4 mr-2 flex-shrink-0" />
                  <span className="truncate text-sm">{file.name}</span>
                </Button>
              );
            })}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}


