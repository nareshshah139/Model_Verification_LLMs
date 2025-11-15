# CodeAct API Server Setup Guide

## Problem: API Server Not Working in UI

If OpenRouter (or other LLM providers) work in test scripts but not in the UI, it's likely because the **API server is not running with the virtual environment activated**.

## Solution: Start API Server with Virtual Environment

The CodeAct API server (`api_server.py`) requires Python packages installed in a virtual environment. When you run tests with `source venv/bin/activate`, they work because the venv is active. But if the API server was started without activating the venv, it won't have access to those packages.

### Quick Fix

**Option 1: Use the Startup Script (Recommended)**

```bash
cd services/codeact_cardcheck
./start_api_server.sh
```

This script automatically:
- Detects and activates the virtual environment
- Checks for required dependencies
- Starts the API server

**Option 2: Manual Start**

```bash
cd services/codeact_cardcheck

# 1. Activate virtual environment
source venv/bin/activate  # On Windows: venv\Scripts\activate

# 2. Verify dependencies are installed
python -c "import openai; print('✅ OpenAI installed')"

# 3. Start the server
python api_server.py
```

### Verify It's Working

1. **Check the startup logs**: When the server starts, you should see:
   ```
   Python executable: /path/to/venv/bin/python
   Python version: 3.x.x
   OpenAI package version: x.x.x
   ```

2. **Test the endpoint**:
   ```bash
   curl http://localhost:8001/astgrep/rulepacks
   ```
   Should return JSON, not an error.

3. **Check from UI**: Try verifying a model card from the UI. It should work now.

## Common Issues

### Issue 1: "No module named 'openai'"

**Cause**: API server is running without venv activated.

**Fix**: 
```bash
cd services/codeact_cardcheck
source venv/bin/activate
python api_server.py
```

### Issue 2: "ModuleNotFoundError: No module named 'yaml'"

**Cause**: Missing `pyyaml` package.

**Fix**:
```bash
cd services/codeact_cardcheck
source venv/bin/activate
pip install pyyaml
```

### Issue 3: API server starts but requests fail

**Cause**: API server might be using wrong Python interpreter.

**Check**: Look at the startup logs. The "Python executable" should point to the venv's Python:
```
Python executable: /path/to/services/codeact_cardcheck/venv/bin/python
```

If it shows system Python instead, the venv isn't activated.

## Running in Background

If you want to run the API server in the background:

```bash
cd services/codeact_cardcheck
source venv/bin/activate
nohup python api_server.py > api_server.log 2>&1 &
```

Or use a process manager like `pm2`:

```bash
cd services/codeact_cardcheck
source venv/bin/activate
pm2 start api_server.py --name codeact-api --interpreter python
```

## Docker Setup (Alternative)

If you prefer Docker, you can run the API server in a container:

```yaml
# docker-compose.yaml
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

## Verification Checklist

- [ ] Virtual environment exists at `services/codeact_cardcheck/venv`
- [ ] Virtual environment is activated before starting server
- [ ] `openai` package is installed: `pip list | grep openai`
- [ ] API server starts without errors
- [ ] Startup logs show venv Python path
- [ ] Test endpoint responds: `curl http://localhost:8001/astgrep/rulepacks`
- [ ] UI can connect to API server

## Still Having Issues?

1. **Check Python version**: Should be Python 3.10+
   ```bash
   python --version
   ```

2. **Reinstall dependencies**:
   ```bash
   cd services/codeact_cardcheck
   source venv/bin/activate
   pip install -e .
   ```

3. **Check API server logs**: Look for error messages when starting

4. **Verify port is available**:
   ```bash
   lsof -i:8001
   ```

5. **Test OpenRouter directly**:
   ```bash
   cd services/codeact_cardcheck
   source venv/bin/activate
   python test_openrouter.py <your-api-key>
   ```

If tests work but UI doesn't, the issue is definitely the API server not using the venv.

