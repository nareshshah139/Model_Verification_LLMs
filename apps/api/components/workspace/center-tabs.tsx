"use client";

import React from "react";
import { useWorkspace } from "./workspace-context";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export function CenterTabs() {
  const { tabs, activeId, setActive, closeTab } = useWorkspace();

  if (!tabs.length) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No items open. Use the File Explorer or Model Card to open something.
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b">
        <ScrollArea className="w-full">
          <Tabs value={activeId ?? undefined} onValueChange={setActive} className="w-full">
            <TabsList className="h-10 w-max">
              {tabs.map((tab) => (
                <div key={tab.id} className="relative">
                  <TabsTrigger value={tab.id} className="pr-8">
                    <span className="mr-2 text-xs uppercase text-muted-foreground">
                      {tab.kind === "python" ? "PY" : "IPYNB"}
                    </span>
                    {tab.title}
                  </TabsTrigger>
                  <Button
                    aria-label={`Close ${tab.title}`}
                    size="icon"
                    variant="ghost"
                    className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                    onClick={(e) => {
                      e.stopPropagation();
                      closeTab(tab.id);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </TabsList>
            {/* Content panes */}
            {tabs.map((tab) => (
              <TabsContent key={tab.id} value={tab.id} className="h-[calc(100vh-13.5rem)] p-4">
                {tab.kind === "python" && <PythonEditor path={tab.payload.path} />}
                {tab.kind === "notebook" && <NotebookRenderer path={tab.payload.path} />}
              </TabsContent>
            ))}
          </Tabs>
        </ScrollArea>
      </div>
    </div>
  );
}

function PythonEditor({ path }: { path: string }) {
  return (
    <Card className="h-full">
      <CardContent className="h-full p-0">
        <div className="flex h-full flex-col">
          <div className="border-b px-4 py-2 text-sm text-muted-foreground">
            Editing: <Badge variant="secondary">{path}</Badge>
          </div>
          <div className="flex-1 p-4">
            {/* Placeholder editor area. Wire to your code editor of choice. */}
            <pre className="h-full w-full overflow-auto rounded-lg border bg-muted/30 p-4 text-xs leading-relaxed">
              {`# %% 
# This is a placeholder Python editor.
# Plug in Monaco, CodeMirror, or your editor of choice here.

def greet(name: str) -> str:
    return f"Hello, {name}!"



if __name__ == "__main__":
    print(greet("world"))
`}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NotebookRenderer({ path }: { path: string }) {
  const [notebook, setNotebook] = React.useState<any>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const { notebookDiscrepancies } = useWorkspace();
  
  // Get discrepancies from context and track in local state
  // This ensures the component re-renders when the Map changes
  const [discrepancies, setDiscrepancies] = React.useState<any>(undefined);
  
  React.useEffect(() => {
    const disc = notebookDiscrepancies.get(path);
    setDiscrepancies(disc);
  }, [notebookDiscrepancies, path]);

  React.useEffect(() => {
    async function loadNotebook() {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch(`/api/notebooks/content?path=${encodeURIComponent(path)}`);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load notebook");
        }
        
        const data = await response.json();
        setNotebook(data.notebook);
      } catch (err: any) {
        console.error("Error loading notebook:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadNotebook();
  }, [path]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardContent className="h-full p-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-sm text-muted-foreground">Loading notebook...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="h-full">
        <CardContent className="h-full p-0">
          <div className="flex h-full flex-col">
            <div className="border-b px-4 py-2 text-sm text-muted-foreground">
              Notebook: <Badge variant="secondary">{path}</Badge>
            </div>
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center max-w-md">
                <div className="text-red-500 mb-2">⚠️ Error loading notebook</div>
                <p className="text-sm text-muted-foreground">{error}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  Make sure the notebook file exists at: {path}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!notebook) {
    return (
      <Card className="h-full">
        <CardContent className="h-full p-0 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No notebook data</p>
        </CardContent>
      </Card>
    );
  }

  // Dynamic import to avoid circular dependencies
  const NotebookViewer = React.lazy(() => 
    import("@/components/notebook/NotebookViewer").then(mod => ({ default: mod.NotebookViewer }))
  );

  return (
    <Card className="h-full">
      <CardContent className="h-full p-0">
        <React.Suspense fallback={
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">Loading viewer...</p>
          </div>
        }>
          <NotebookViewer notebook={notebook} path={path} discrepancies={discrepancies} />
        </React.Suspense>
      </CardContent>
    </Card>
  );
}


