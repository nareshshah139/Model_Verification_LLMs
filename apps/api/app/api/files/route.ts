import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dirPath = searchParams.get("path") || process.cwd();
    
    // Security: Ensure the path is within allowed directories
    const allowedBase = "/Users/nshah/Documents/AST-RAG-Based-Model-Card-Checks";
    const resolvedPath = path.resolve(dirPath);
    
    if (!resolvedPath.startsWith(allowedBase)) {
      return NextResponse.json(
        { error: "Access denied to this directory" },
        { status: 403 }
      );
    }

    // Check if directory exists
    if (!fs.existsSync(resolvedPath)) {
      return NextResponse.json(
        { error: "Directory not found" },
        { status: 404 }
      );
    }

    // Read directory contents
    const entries = fs.readdirSync(resolvedPath, { withFileTypes: true });
    
    const files = entries
      .filter((entry) => {
        // Filter out hidden files and certain directories
        const name = entry.name;
        return (
          !name.startsWith(".") &&
          name !== "node_modules" &&
          name !== "__pycache__" &&
          name !== ".git"
        );
      })
      .map((entry) => {
        const fullPath = path.join(resolvedPath, entry.name);
        const stats = fs.statSync(fullPath);
        
        return {
          name: entry.name,
          path: fullPath,
          isDirectory: entry.isDirectory(),
          size: stats.size,
          modified: stats.mtime.toISOString(),
          extension: entry.isDirectory() ? null : path.extname(entry.name).slice(1),
        };
      })
      .sort((a, b) => {
        // Directories first, then files
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

    return NextResponse.json({
      currentPath: resolvedPath,
      parentPath: path.dirname(resolvedPath),
      canGoUp: resolvedPath !== allowedBase,
      files,
    });
  } catch (error) {
    console.error("Error reading directory:", error);
    return NextResponse.json(
      { error: "Failed to read directory" },
      { status: 500 }
    );
  }
}


