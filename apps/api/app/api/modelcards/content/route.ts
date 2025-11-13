import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filePath = searchParams.get("path");
    const fileType = searchParams.get("type"); // 'markdown' or 'docx'

    if (!filePath) {
      return NextResponse.json({ error: "path parameter is required" }, { status: 400 });
    }

    // Security: ensure path doesn't escape the project directory
    const normalizedPath = path.normalize(filePath);
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
          error: "Model card file not found", 
          triedPaths: possiblePaths 
        }, { status: 404 });
      }
    }

    // Read file
    const fileBuffer = await fs.readFile(fullPath);

    // For markdown files, return as text
    if (fileType === "markdown") {
      const content = fileBuffer.toString("utf-8");
      return NextResponse.json({ content, path: filePath, type: "markdown" });
    }

    // For Word documents, return as binary with appropriate headers
    if (fileType === "docx") {
      return new NextResponse(fileBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `inline; filename="${path.basename(fullPath)}"`,
        },
      });
    }

    // Default: return as text
    const content = fileBuffer.toString("utf-8");
    return NextResponse.json({ content, path: filePath });

  } catch (error: any) {
    console.error("Error reading model card:", error);
    return NextResponse.json({ 
      error: "Failed to read model card", 
      details: error.message 
    }, { status: 500 });
  }
}

