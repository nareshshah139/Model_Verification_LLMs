"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings, AlertCircle, CheckCircle2, XCircle, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type LLMProvider = "openai" | "anthropic" | "openrouter";

interface LLMConfig {
  provider: LLMProvider;
  model: string;
  hasApiKey?: boolean;
}

const OPENAI_MODELS = [
  { value: "gpt-4o", label: "GPT-4o", badge: "Latest" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini", badge: "Fast" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
  { value: "gpt-4", label: "GPT-4" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
];

const ANTHROPIC_MODELS = [
  { value: "claude-sonnet-4-5", label: "Claude Sonnet 4.5", badge: "Latest" },
  { value: "claude-opus-4-1", label: "Claude Opus 4.1", badge: "Powerful" },
  { value: "claude-haiku-4-5", label: "Claude Haiku 4.5", badge: "Fast" },
  { value: "claude-3-5-sonnet-20241022", label: "Claude 3.5 Sonnet (Oct 2024)" },
  { value: "claude-3-5-sonnet-20240620", label: "Claude 3.5 Sonnet (Jun 2024)" },
  { value: "claude-3-opus-20240229", label: "Claude 3 Opus" },
  { value: "claude-3-sonnet-20240229", label: "Claude 3 Sonnet" },
  { value: "claude-3-haiku-20240307", label: "Claude 3 Haiku" },
];

const OPENROUTER_MODELS = [
  { value: "openai/gpt-5-pro", label: "GPT-5 Pro (via OpenRouter)", badge: "Latest" },
  { value: "openai/gpt-5-codex", label: "GPT-5 Codex (via OpenRouter)", badge: "Coding" },
  { value: "openai/gpt-4o", label: "GPT-4o (via OpenRouter)", badge: "Latest" },
  { value: "openai/gpt-4o-mini", label: "GPT-4o Mini (via OpenRouter)", badge: "Fast" },
  { value: "openai/gpt-4-turbo", label: "GPT-4 Turbo (via OpenRouter)" },
  { value: "anthropic/claude-sonnet-4-5", label: "Claude Sonnet 4.5 (via OpenRouter)" },
  { value: "anthropic/claude-opus-4-1", label: "Claude Opus 4.1 (via OpenRouter)", badge: "Powerful" },
  { value: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet (via OpenRouter)" },
  { value: "anthropic/claude-3-opus", label: "Claude 3 Opus (via OpenRouter)" },
  { value: "google/gemini-pro-1.5", label: "Gemini Pro 1.5" },
  { value: "meta-llama/llama-3.1-405b-instruct", label: "Llama 3.1 405B" },
  { value: "mistralai/mistral-large", label: "Mistral Large" },
];

export function LLMSettings() {
  const [open, setOpen] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<LLMConfig | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<LLMProvider>("anthropic");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load current configuration
  useEffect(() => {
    if (open) {
      loadCurrentConfig();
    }
  }, [open]);

  const loadCurrentConfig = async () => {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/llm/config");
      if (response.ok) {
        const config = await response.json();
        setCurrentConfig(config);
        setSelectedProvider(config.provider);
        setSelectedModel(config.model);
      } else {
        setError("Failed to load configuration");
      }
    } catch (err) {
      console.error("Failed to load LLM config:", err);
      setError("Failed to load configuration");
    } finally {
      setLoading(false);
    }
  };

  const saveConfiguration = async () => {
    setSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/llm/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
        }),
      });
      
      if (response.ok) {
        const updatedConfig = await response.json();
        setCurrentConfig(updatedConfig);
        setSuccessMessage("Configuration saved successfully! Restart services to apply changes.");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to save configuration");
      }
    } catch (err) {
      console.error("Failed to save LLM config:", err);
      setError("Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const getAvailableModels = () => {
    switch (selectedProvider) {
      case "openai":
        return OPENAI_MODELS;
      case "anthropic":
        return ANTHROPIC_MODELS;
      case "openrouter":
        return OPENROUTER_MODELS;
      default:
        return ANTHROPIC_MODELS;
    }
  };

  // Update selected model when provider changes
  useEffect(() => {
    const models = getAvailableModels();
    if (models.length > 0 && !models.find(m => m.value === selectedModel)) {
      setSelectedModel(models[0].value);
    }
  }, [selectedProvider]);

  const getCurrentModelLabel = () => {
    if (!currentConfig) return "Not configured";
    const models = 
      currentConfig.provider === "openai" 
        ? OPENAI_MODELS 
        : currentConfig.provider === "anthropic"
        ? ANTHROPIC_MODELS
        : OPENROUTER_MODELS;
    const modelInfo = models.find((m) => m.value === currentConfig.model);
    return modelInfo ? modelInfo.label : currentConfig.model;
  };

  const getProviderName = (provider: LLMProvider) => {
    switch (provider) {
      case "openai": return "OpenAI";
      case "anthropic": return "Anthropic";
      case "openrouter": return "OpenRouter";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          LLM Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>LLM Configuration</DialogTitle>
          <DialogDescription>
            Configure your LLM provider and model. Changes are saved to .env file.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {loading && (
            <div className="text-center text-sm text-muted-foreground">
              Loading configuration...
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {successMessage}
              </AlertDescription>
            </Alert>
          )}

          {!loading && currentConfig && (
            <>
              {/* Configuration Form */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="provider">LLM Provider</Label>
                  <Select
                    value={selectedProvider}
                    onValueChange={(value) => setSelectedProvider(value as LLMProvider)}
                  >
                    <SelectTrigger id="provider">
                      <SelectValue placeholder="Select provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="anthropic">
                        <div className="flex items-center gap-2">
                          <span>Anthropic (Claude)</span>
                          {currentConfig.provider === "anthropic" && currentConfig.hasApiKey && (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </SelectItem>
                      <SelectItem value="openai">
                        <div className="flex items-center gap-2">
                          <span>OpenAI (GPT)</span>
                          {currentConfig.provider === "openai" && currentConfig.hasApiKey && (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </SelectItem>
                      <SelectItem value="openrouter">
                        <div className="flex items-center gap-2">
                          <span>OpenRouter (Multi-model)</span>
                          {currentConfig.provider === "openrouter" && currentConfig.hasApiKey && (
                            <CheckCircle2 className="h-3 w-3 text-green-600" />
                          )}
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <Select
                    value={selectedModel}
                    onValueChange={setSelectedModel}
                  >
                    <SelectTrigger id="model">
                      <SelectValue placeholder="Select model" />
                    </SelectTrigger>
                    <SelectContent>
                      {getAvailableModels().map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex items-center gap-2">
                            <span>{model.label}</span>
                            {model.badge && (
                              <Badge variant="secondary" className="text-xs">
                                {model.badge}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Save Button */}
                <Button
                  onClick={saveConfiguration}
                  disabled={saving}
                  className="w-full gap-2"
                >
                  {saving ? (
                    <>Saving...</>
                  ) : (
                    <>
                      <Save className="h-4 w-4" />
                      Save Configuration
                    </>
                  )}
                </Button>
              </div>

              {/* API Key Status */}
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold">API Key Status</h4>
                    <p className="text-xs text-muted-foreground">
                      {selectedProvider === "anthropic" && "Anthropic"}
                      {selectedProvider === "openai" && "OpenAI"}
                      {selectedProvider === "openrouter" && "OpenRouter"} API Key
                    </p>
                  </div>
                  {(selectedProvider === currentConfig.provider && currentConfig.hasApiKey) ? (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Configured</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-orange-600">
                      <AlertCircle className="h-4 w-4" />
                      <span>Not Set</span>
                    </div>
                  )}
                </div>

                <Alert>
                  <AlertDescription className="text-xs">
                    {(selectedProvider === currentConfig.provider && currentConfig.hasApiKey) ? (
                      <span>
                        ✓ API key is configured in .env file. You can use verification features.
                      </span>
                    ) : (
                      <div className="space-y-2">
                        <span>
                          To use verification features, add your API key to the .env file:
                        </span>
                        <div className="font-mono bg-muted p-2 rounded text-xs mt-1">
                          {selectedProvider.toUpperCase()}_API_KEY=your-key-here
                        </div>
                        <Button variant="outline" size="sm" className="mt-2" asChild>
                          <a
                            href={
                              selectedProvider === "openai"
                                ? "https://platform.openai.com/api-keys"
                                : selectedProvider === "anthropic"
                                ? "https://console.anthropic.com/"
                                : "https://openrouter.ai/keys"
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Get {getProviderName(selectedProvider)} API Key →
                          </a>
                        </Button>
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              </div>
            </>
          )}
        </div>

        {/* Close Button */}
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
