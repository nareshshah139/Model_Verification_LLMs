import React, { useState } from "react";

interface FileNode {
  type: "file" | "folder";
  id?: string;
  path?: string;
  lang?: string;
  isNotebook?: boolean;
  children?: Record<string, FileNode>;
}

interface FileTreeProps {
  tree: Record<string, FileNode>;
  onFileSelect: (path: string, isNotebook: boolean) => void;
  selectedPath?: string;
}

export function FileTree({ tree, onFileSelect, selectedPath }: FileTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  
  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };
  
  const renderNode = (name: string, node: FileNode, parentPath: string = ""): React.ReactNode => {
    const fullPath = parentPath ? `${parentPath}/${name}` : name;
    const isExpanded = expanded.has(fullPath);
    
    if (node.type === "folder") {
      return (
        <div key={fullPath}>
          <div
            onClick={() => toggleFolder(fullPath)}
            style={{
              padding: "4px 8px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              userSelect: "none",
            }}
          >
            <span style={{ marginRight: 4 }}>{isExpanded ? "📂" : "📁"}</span>
            <span>{name}</span>
          </div>
          {isExpanded && node.children && (
            <div style={{ marginLeft: 16 }}>
              {Object.entries(node.children).map(([childName, childNode]) =>
                renderNode(childName, childNode, fullPath)
              )}
            </div>
          )}
        </div>
      );
    } else {
      const filePath = node.path ?? fullPath;
      const isSelected = selectedPath === filePath;
      return (
        <div
          key={filePath}
          onClick={() => onFileSelect(filePath, node.isNotebook ?? false)}
          style={{
            padding: "4px 8px",
            cursor: "pointer",
            backgroundColor: isSelected ? "#e3f2fd" : "transparent",
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{ marginRight: 4 }}>
            {node.isNotebook ? "📓" : "📄"}
          </span>
          <span>{name}</span>
        </div>
      );
    }
  };
  
  return (
    <div style={{ height: "100%", overflow: "auto", padding: 8 }}>
      {Object.entries(tree).map(([name, node]) => renderNode(name, node))}
    </div>
  );
}

