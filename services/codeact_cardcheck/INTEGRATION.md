# Integration Guide

## Integration with Next.js API

The CodeAct CardCheck agent can be integrated with the existing Next.js API in two ways:

### Option 1: HTTP API Service (Recommended)

Run the agent as a FastAPI service and call it from Node.js:

#### Start the Service

```bash
cd services/codeact_cardcheck
source .venv/bin/activate
python api_server.py
```

The service runs on `http://localhost:8001` by default.

#### Use from Node.js

```typescript
// apps/api/src/lib/codeact.ts
export async function verifyWithCodeAct(
  modelCardText: string,
  repoUrl?: string,
  repoPath?: string
) {
  const response = await fetch("http://localhost:8001/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model_card_text: modelCardText,
      repo_url: repoUrl,
      repo_path: repoPath,
      runtime_enabled: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`CodeAct verification failed: ${response.status}`);
  }

  return await response.json();
}
```

### Option 2: Direct Python Execution

Call the agent directly using Node.js child_process:

```typescript
// apps/api/src/lib/codeact.ts
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

export async function verifyWithCodeActDirect(
  modelCardText: string,
  repoUrl: string,
  outputDir: string
) {
  // Write model card to temp file
  const cardPath = path.join(outputDir, "model_card.md");
  await fs.writeFile(cardPath, modelCardText);

  // Run agent
  const agentPath = path.join(
    process.cwd(),
    "services/codeact_cardcheck/agent_main.py"
  );
  const { stdout, stderr } = await execAsync(
    `python3 ${agentPath} ${cardPath} --repo-url ${repoUrl} --output-dir ${outputDir}`
  );

  // Read report
  const reportPath = path.join(outputDir, "verification_report.json");
  const reportText = await fs.readFile(reportPath, "utf-8");
  return JSON.parse(reportText);
}
```

## Environment Variables

Add to `apps/api/.env`:

```bash
CODEACT_URL=http://localhost:8001
CODEACT_ENABLED=true
```

## API Endpoint Integration

Add a new endpoint to use CodeAct verification:

```typescript
// apps/api/app/api/analyze/codeact/[modelVersionId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "../../../../../src/lib/prisma";
import { verifyWithCodeAct } from "../../../../../src/lib/codeact";

export async function POST(
  _req: Request,
  { params }: { params: { modelVersionId: string } }
) {
  const { modelVersionId } = params;
  const version = await prisma.modelVersion.findUnique({
    where: { id: modelVersionId },
  });
  if (!version) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const card = await prisma.modelCard.findFirst({
    where: { modelId: version.modelId },
    orderBy: { createdAt: "desc" },
  });

  if (!card) {
    return NextResponse.json({ error: "No model card found" }, { status: 404 });
  }

  // Get repo URL from version or model
  const repoUrl = version.gitRepoUrl || version.model?.gitRepoUrl;

  if (!repoUrl) {
    return NextResponse.json(
      { error: "No repository URL found" },
      { status: 400 }
    );
  }

  // Run CodeAct verification
  const result = await verifyWithCodeAct(card.rawText, repoUrl);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      { status: 500 }
    );
  }

  // Persist findings as discrepancies
  const findings = result.report?.findings || [];
  if (findings.length > 0) {
    await prisma.discrepancy.createMany({
      data: findings.map((f: any) => ({
        modelVersionId,
        modelCardId: card.id,
        category: f.claim || "codeact",
        severity: f.impact === "high" ? "high" : f.impact === "medium" ? "med" : "low",
        description: f.claim || "",
        evidence: f.evidence || {},
        source: "codeact",
      })),
    });
  }

  return NextResponse.json({
    success: true,
    report: result.report,
    findingsCount: findings.length,
  });
}
```

## Docker Integration

Add to `docker-compose.yaml`:

```yaml
services:
  codeact:
    build:
      context: ./services/codeact_cardcheck
      dockerfile: Dockerfile
    ports:
      - "8001:8001"
    environment:
      - PYTHONUNBUFFERED=1
    volumes:
      - ./services/codeact_cardcheck:/app
    command: python api_server.py
```

## Testing Integration

```bash
# Start CodeAct service
cd services/codeact_cardcheck
source .venv/bin/activate
python api_server.py

# In another terminal, test the API
curl -X POST http://localhost:8001/verify \
  -H "Content-Type: application/json" \
  -d '{
    "model_card_text": "# Model Card\n...",
    "repo_url": "https://github.com/user/repo.git"
  }'
```

