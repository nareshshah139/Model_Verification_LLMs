# Unified Environment Configuration

This project uses a **single centralized `.env` file** located at the project root that both the Next.js frontend and Python backend services share.

## 📁 File Structure

```
AST-RAG-Based-Model-Card-Checks/
├── .env                          # ← Single source of truth (gitignored)
├── env.config.template           # ← Template with all options documented
├── setup-env.sh                  # ← Interactive setup script
├── start-all-services.sh         # ← Start both services with unified config
│
├── apps/api/                     # Next.js frontend
│   ├── next.config.mjs           # Loads from root .env
│   └── package.json
│
└── services/codeact_cardcheck/   # Python backend
    ├── start_api_server.sh       # Loads from root .env
    └── api_server.py
```

## 🚀 Quick Start

### 1. Create Configuration (First Time Only)

Run the interactive setup script:

```bash
./setup-env.sh
```

This will:
- Create `.env` from template
- Prompt you for API keys
- Validate the configuration

### 2. Manual Configuration (Alternative)

Copy the template and edit:

```bash
cp env.config.template .env
# Then edit .env and add your API keys
```

### 3. Start All Services

Use the convenience script to start both services:

```bash
./start-all-services.sh
```

Or start them individually:

```bash
# Terminal 1 - Backend
cd services/codeact_cardcheck
./start_api_server.sh

# Terminal 2 - Frontend  
cd apps/api
pnpm dev
```

## 🔑 Configuration Options

The `.env` file supports:

### LLM Provider Settings
```bash
LLM_PROVIDER=anthropic              # openai, anthropic, or openrouter
LLM_MODEL=claude-sonnet-4-5         # Model name (provider-specific)
```

### API Keys
```bash
OPENAI_API_KEY=sk-...               # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-...        # Anthropic API key
OPENROUTER_API_KEY=sk-or-...        # OpenRouter API key (optional)
```

### Service URLs
```bash
CODEACT_API_URL=http://localhost:8001    # Python backend URL
INSPECTOR_URL=http://localhost:8000       # Inspector service URL
```

### Performance Settings
```bash
CODEACT_MAX_WORKERS=1                    # Parallel workers (1=sequential)
CLAIM_EXTRACT_LOG_REQUEST=truncated      # Logging verbosity
PYTHONUNBUFFERED=1                        # Python output buffering
```

## 🔄 How It Works

### Next.js Frontend (apps/api)

The `next.config.mjs` file loads the root `.env` at build time:

```javascript
import { config } from 'dotenv';
import { resolve } from 'path';

const projectRoot = resolve(process.cwd(), '../..');
config({ path: resolve(projectRoot, '.env') });
```

Environment variables are then available via:
- `process.env.VARIABLE_NAME` (server-side)
- `process.env.NEXT_PUBLIC_*` (client-side, if prefixed)

### Python Backend (services/codeact_cardcheck)

The `start_api_server.sh` script loads the root `.env`:

```bash
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$PROJECT_ROOT/.env"
```

Variables are then available via `os.environ` in Python:

```python
api_key = os.environ.get("ANTHROPIC_API_KEY")
```

## 🔐 API Key Management

API keys are **exclusively** managed through the root `.env` file. This provides:

✅ **Security** - Keys never exposed to the UI or browser  
✅ **Simplicity** - Single source of truth  
✅ **Safety** - .env is gitignored automatically  
✅ **Consistency** - Both services use identical keys  

### Configuration Flow

```
Developer edits .env at project root
    ↓
Sets API keys: ANTHROPIC_API_KEY=sk-ant-...
    ↓
Starts/restarts services
    ↓
Both services load .env automatically
    ↓
Keys available via process.env / os.environ
    ↓
Verification uses keys from environment
```

### UI Status Display (Read-Only)

The **LLM Status** button in the UI shows:
- ✅ Current provider and model
- ✅ Whether API key is configured (yes/no indicator)
- ✅ Instructions for updating configuration
- ✅ Link to get API keys from providers

**Important:** The UI does **not** allow editing API keys. All configuration is done via the `.env` file for security.

## ⚠️ Security Best Practices

1. **Never commit `.env` to version control**
   - Already in `.gitignore`
   - Contains sensitive API keys

2. **Use `.env.local` for local overrides** (optional)
   - Next.js automatically loads this
   - Also gitignored
   - Overrides root `.env` values

3. **Rotate API keys regularly**
   - OpenAI: https://platform.openai.com/api-keys
   - Anthropic: https://console.anthropic.com/
   - OpenRouter: https://openrouter.ai/keys

4. **Restrict API key permissions**
   - Use read-only keys where possible
   - Set spending limits

## 🧪 Testing Configuration

### Check Backend Configuration

```bash
curl http://localhost:8001/health
```

Response shows which keys are configured:

```json
{
  "status": "healthy",
  "env": {
    "has_openai_key": true,
    "has_anthropic_key": true,
    "has_openrouter_key": false
  }
}
```

### Check Frontend Configuration

Visit: http://localhost:3000/api/health

Response shows service health and backend connectivity.

## 🐛 Troubleshooting

### Backend can't find API keys

```bash
# Verify .env exists and has keys
cat .env | grep API_KEY

# Manually source and start backend
cd services/codeact_cardcheck
source ../../.env
./start_api_server.sh
```

### Frontend can't connect to backend

```bash
# Check backend is running
curl http://localhost:8001/health

# Check CODEACT_API_URL in .env
grep CODEACT_API_URL .env
```

### API keys not working

1. Check key format:
   - OpenAI: `sk-...`
   - Anthropic: `sk-ant-...`
   - OpenRouter: `sk-or-...`

2. Verify key is valid:
   ```bash
   # Test Anthropic key
   curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages
   ```

3. Check key hasn't expired or reached quota

## 📚 Related Documentation

- [LLM Settings Quick Start](apps/api/LLM_SETTINGS_QUICK_START.md)
- [API Key Configuration](API_KEY_CONFIGURATION.md)
- [Quick Start Guide](QUICK_START.md)

## 🔄 Migration from Old Configuration

If you previously had separate `.env.local` files:

```bash
# Backup old config
cp apps/api/.env.local apps/api/.env.local.backup

# Run setup
./setup-env.sh

# Verify both services work
./start-all-services.sh
```

The new unified configuration is simpler and reduces configuration drift between services.

