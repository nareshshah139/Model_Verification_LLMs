import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const notebookPath = searchParams.get("path");

    if (!notebookPath) {
      return NextResponse.json({ error: "path parameter is required" }, { status: 400 });
    }

    // Security: ensure path doesn't escape the project directory
    const normalizedPath = path.normalize(notebookPath);
    if (normalizedPath.includes("..")) {
      return NextResponse.json({ error: "Invalid path" }, { status: 403 });
    }

    // Check if path is absolute or relative
    let fullPath: string;
    if (path.isAbsolute(normalizedPath)) {
      fullPath = normalizedPath;
    } else {
      // For relative paths, look in common locations
      const projectRoot = process.cwd();
      
      // Try different possible locations
      const possiblePaths = [
        path.join(projectRoot, normalizedPath),
        path.join(projectRoot, "public", normalizedPath),
        path.join(projectRoot, "..", "..", normalizedPath), // From apps/api up to root
      ];

      let found = false;
      for (const tryPath of possiblePaths) {
        try {
          await fs.access(tryPath);
          fullPath = tryPath;
          found = true;
          break;
        } catch {
          continue;
        }
      }

      if (!found) {
        return NextResponse.json({ 
          error: "Notebook file not found", 
          triedPaths: possiblePaths 
        }, { status: 404 });
      }
    }

    // Read and parse notebook file
    const content = await fs.readFile(fullPath, "utf-8");
    const notebook = JSON.parse(content);

    return NextResponse.json({ notebook, path: notebookPath });
  } catch (error: any) {
    console.error("Error reading notebook:", error);
    return NextResponse.json({ 
      error: "Failed to read notebook", 
      details: error.message 
    }, { status: 500 });
  }
}

