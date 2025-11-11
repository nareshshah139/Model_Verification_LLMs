import React from "react";
import { DiscrepancyList } from "./components/DiscrepancyList";
import { StreamedAnalyzerPanel } from "./components/StreamedAnalyzerPanel";
import { FileTree } from "./components/FileTree";
import { FileViewer } from "./components/FileViewer";
import { ModelCardViewer } from "./components/ModelCardViewer";
import { Link, useParams } from "react-router-dom";

function Home() {
  return <div>Model-Card Discrepancy Explorer</div>;
}

function AnalyzePage() {
  return (
    <div>
      <h2>Analyze</h2>
      <StreamedAnalyzerPanel modelVersionId="latest" />
    </div>
  );
}

function ModelsPage() {
  const [models, setModels] = React.useState<Array<{ id: string; name: string }>>([]);
  React.useEffect(() => {
    (async () => {
      const r = await fetch("/api/models");
      const j = await r.json();
      setModels(j.models ?? []);
    })();
  }, []);
  return (
    <div>
      <h2>Models</h2>
      <ul>
        {models.map((m) => (
          <li key={m.id}><Link to={`/models/${m.id}`}>{m.name}</Link></li>
        ))}
      </ul>
      <p><Link to="/ingest">Ingest a model</Link></p>
    </div>
  );
}

function DiscrepanciesPage() {
  const [discrepancies, setDiscrepancies] = React.useState<Array<{
    id?: string;
    category: string;
    severity: "low" | "med" | "high";
    description: string;
  }>>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      try {
        // Fetch all models
        const modelsRes = await fetch("/api/models");
        const modelsData = await modelsRes.json();
        const models = modelsData.models ?? [];

        // Fetch discrepancies for each model
        const allDiscrepancies: Array<{
          id?: string;
          category: string;
          severity: "low" | "med" | "high";
          description: string;
        }> = [];

        for (const model of models) {
          try {
            const discRes = await fetch(`/api/models/${model.id}/discrepancies`);
            const discData = await discRes.json();
            if (discData.discrepancies) {
              allDiscrepancies.push(...discData.discrepancies);
            }
          } catch (err) {
            console.error(`Failed to fetch discrepancies for model ${model.id}:`, err);
          }
        }

        setDiscrepancies(allDiscrepancies);
      } catch (err) {
        console.error("Failed to fetch discrepancies:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h2>Discrepancies</h2>
      {loading ? (
        <div>Loading discrepancies...</div>
      ) : (
        <DiscrepancyList items={discrepancies} />
      )}
    </div>
  );
}

function ModelDetailPage() {
  const { id } = useParams();
  const [model, setModel] = React.useState<{ id: string; name: string } | null>(null);
  const [versions, setVersions] = React.useState<Array<{ id: string }>>([]);
  const [selectedVersion, setSelectedVersion] = React.useState<string | null>(null);
  const [fileTree, setFileTree] = React.useState<Record<string, any>>({});
  const [selectedFile, setSelectedFile] = React.useState<{
    path: string;
    content: string;
    lang?: string;
    isNotebook?: boolean;
    notebookJson?: any;
  } | null>(null);
  const [modelCard, setModelCard] = React.useState<string>("");
  const [discrepancies, setDiscrepancies] = React.useState<Array<{
    id?: string;
    category: string;
    severity: "low" | "med" | "high";
    description: string;
  }>>([]);
  const [rightPanelTab, setRightPanelTab] = React.useState<"card" | "discrepancies">("card");
  
  React.useEffect(() => {
    (async () => {
      const m = await fetch(`/api/models/${id}`).then((r) => r.json());
      setModel(m.model ?? null);
      const v = await fetch(`/api/models/${id}/versions`).then((r) => r.json());
      setVersions(v.versions ?? []);
      if (v.versions?.[0]?.id) {
        setSelectedVersion(v.versions[0].id);
      }
    })();
  }, [id]);
  
  React.useEffect(() => {
    if (selectedVersion) {
      // Load file tree
      (async () => {
        const tree = await fetch(`/api/models/${id}/versions/${selectedVersion}/files/tree`).then((r) => r.json());
        setFileTree(tree.tree ?? {});
      })();
      
      // Load model card
      (async () => {
        const card = await fetch(`/api/models/${id}`).then((r) => r.json());
        if (card.model) {
          const cards = await fetch(`/api/models/${id}/cards`).then((r) => r.json()).catch(() => ({ cards: [] }));
          if (cards.cards?.[0]?.rawText) {
            setModelCard(cards.cards[0].rawText);
          }
        }
      })();

      // Load discrepancies for the selected version
      (async () => {
        try {
          const discRes = await fetch(`/api/models/${id}/discrepancies?version=${selectedVersion}`);
          const discData = await discRes.json();
          setDiscrepancies(discData.discrepancies ?? []);
        } catch (err) {
          console.error("Failed to fetch discrepancies:", err);
          setDiscrepancies([]);
        }
      })();
    }
  }, [selectedVersion, id]);
  
  const handleFileSelect = async (path: string, isNotebook: boolean) => {
    // Check if it's a model card file (markdown)
    const isModelCard = path.toLowerCase().includes("model_card") || path.toLowerCase().endsWith(".md");
    
    if (isModelCard && !isNotebook) {
      // Load as model card
      const file = await fetch(`/api/models/${id}/versions/${selectedVersion}/files/content?path=${encodeURIComponent(path)}`).then((r) => r.json());
      if (file.file) {
        setModelCard(file.file.contentText);
      }
    } else {
      // Load as regular file or notebook
      const file = await fetch(`/api/models/${id}/versions/${selectedVersion}/files/content?path=${encodeURIComponent(path)}`).then((r) => r.json());
      if (file.file) {
        setSelectedFile({
          path: file.file.path,
          content: file.file.contentText,
          lang: file.file.lang,
          isNotebook: file.file.isNotebook,
          notebookJson: file.file.notebookJson,
        });
      }
    }
  };
  
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 16, borderBottom: "1px solid #ddd", display: "flex", alignItems: "center", gap: 16 }}>
        <h2 style={{ margin: 0 }}>{model?.name ?? "Model"}</h2>
        <select
          value={selectedVersion ?? ""}
          onChange={(e) => setSelectedVersion(e.target.value)}
          style={{ padding: 4 }}
        >
          {versions.map((v) => (
            <option key={v.id} value={v.id}>{v.id}</option>
          ))}
        </select>
        {discrepancies.length > 0 && (
          <div style={{ marginLeft: "auto", padding: "4px 12px", background: "#fff3cd", borderRadius: 4, fontSize: 14 }}>
            {discrepancies.length} discrepancy{discrepancies.length !== 1 ? "ies" : ""}
          </div>
        )}
      </div>
      
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* Left Panel: File Tree */}
        <div style={{ width: "300px", borderRight: "1px solid #ddd", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: 8, borderBottom: "1px solid #ddd", fontWeight: 600 }}>Files</div>
          <div style={{ flex: 1, overflow: "auto" }}>
            <FileTree
              tree={fileTree}
              onFileSelect={handleFileSelect}
              selectedPath={selectedFile?.path}
            />
          </div>
        </div>
        
        {/* Middle Panel: File Viewer */}
        <div style={{ flex: 1, borderRight: "1px solid #ddd", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ padding: 8, borderBottom: "1px solid #ddd", fontWeight: 600 }}>
            {selectedFile ? selectedFile.path : "Select a file"}
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {selectedFile ? (
              <FileViewer
                content={selectedFile.content}
                lang={selectedFile.lang}
                isNotebook={selectedFile.isNotebook}
                notebookJson={selectedFile.notebookJson}
                path={selectedFile.path}
              />
            ) : (
              <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
                Select a file from the folder structure to view
              </div>
            )}
          </div>
        </div>
        
        {/* Right Panel: Model Card and Discrepancies */}
        <div style={{ width: "400px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #ddd" }}>
            <div 
              onClick={() => setRightPanelTab("card")}
              style={{ 
                flex: 1, 
                padding: 8, 
                fontWeight: 600, 
                cursor: "pointer",
                borderRight: "1px solid #ddd",
                background: rightPanelTab === "card" ? "#fff" : "#f5f5f5"
              }}
            >
              Model Card
            </div>
            <div 
              onClick={() => setRightPanelTab("discrepancies")}
              style={{ 
                flex: 1, 
                padding: 8, 
                fontWeight: 600, 
                cursor: "pointer",
                background: rightPanelTab === "discrepancies" ? "#fff" : "#f5f5f5"
              }}
            >
              Discrepancies {discrepancies.length > 0 && `(${discrepancies.length})`}
            </div>
          </div>
          <div style={{ flex: 1, overflow: "auto" }}>
            {rightPanelTab === "card" ? (
              modelCard ? (
                <ModelCardViewer content={modelCard} />
              ) : (
                <div style={{ padding: 16, color: "#999", textAlign: "center" }}>
                  No model card available
                </div>
              )
            ) : (
              <div style={{ padding: 16 }}>
                <DiscrepancyList items={discrepancies} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function IngestPage() {
  const [repoUrl, setRepoUrl] = React.useState("");
  const [uploadMsg, setUploadMsg] = React.useState("");
  return (
    <div>
      <h2>Ingest</h2>
      <section>
        <h3>Git Repo</h3>
        <input placeholder="https://github.com/user/repo" value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} />
        <button onClick={async () => {
          const r = await fetch('/api/ingest/repo', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ repoUrl })});
          const j = await r.json();
          alert(`Queued: ${j.modelId ?? j.jobId ?? ''}`);
        }}>Queue Import</button>
      </section>
      <section style={{ marginTop: 16 }}>
        <h3>Upload</h3>
        <form onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget as HTMLFormElement);
          const r = await fetch('/api/ingest/upload', { method: 'POST', body: fd});
          const j = await r.json();
          setUploadMsg(`Queued: ${j.jobId ?? ''}`);
        }}>
          <input type="file" name="modelCard" accept=".md,.markdown" required />
          <input type="file" name="codeZip" accept=".zip" title="Upload a zip containing .py files and/or .ipynb notebooks" />
          <button type="submit">Upload</button>
        </form>
        {uploadMsg && <p>{uploadMsg}</p>}
      </section>
    </div>
  );
}

export const routes = [
  { path: "/", element: <Home /> },
  { path: "/models", element: <ModelsPage /> },
  { path: "/analyze", element: <AnalyzePage /> },
  { path: "/discrepancies", element: <DiscrepanciesPage /> },
  { path: "/models/:id", element: <ModelDetailPage /> },
  { path: "/ingest", element: <IngestPage /> },
];

