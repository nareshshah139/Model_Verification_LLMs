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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

type LLMProvider = "openai" | "anthropic";

interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey: string;
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

export function LLMSettings() {
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState<LLMProvider>("openai");
  const [model, setModel] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [currentConfig, setCurrentConfig] = useState<LLMConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Load current configuration
  useEffect(() => {
    if (open) {
      loadCurrentConfig();
    }
  }, [open]);

  const loadCurrentConfig = async () => {
    try {
      const response = await fetch("/api/llm/config");
      if (response.ok) {
        const config = await response.json();
        setCurrentConfig(config);
        setProvider(config.provider);
        setModel(config.model);
        // Don't load API key for security reasons
      }
    } catch (err) {
      console.error("Failed to load LLM config:", err);
    }
  };

  const handleSave = async () => {
    setError(null);
    setSuccess(false);

    if (!model) {
      setError("Please select a model");
      return;
    }

    if (!apiKey && provider !== currentConfig?.provider) {
      setError(`Please enter your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key`);
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/llm/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider,
          model,
          ...(apiKey && { apiKey }),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save configuration");
      }

      setSuccess(true);
      setCurrentConfig({ provider, model, apiKey: "" });
      
      // Clear API key field after successful save
      setApiKey("");
      
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  const getModels = () => {
    return provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
  };

  const getCurrentModelLabel = () => {
    if (!currentConfig) return "Not configured";
    const models = currentConfig.provider === "openai" ? OPENAI_MODELS : ANTHROPIC_MODELS;
    const modelInfo = models.find((m) => m.value === currentConfig.model);
    return modelInfo ? modelInfo.label : currentConfig.model;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          LLM Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>LLM Configuration</DialogTitle>
          <DialogDescription>
            Configure your LLM provider and model. Changes take effect immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Configuration */}
          {currentConfig && (
            <Alert>
              <AlertDescription className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">
                  Current: <strong>{currentConfig.provider === "openai" ? "OpenAI" : "Anthropic"}</strong> -{" "}
                  {getCurrentModelLabel()}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Provider Selection */}
          <div className="space-y-2">
            <Label htmlFor="provider">Provider</Label>
            <Select value={provider} onValueChange={(value) => setProvider(value as LLMProvider)}>
              <SelectTrigger id="provider">
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Model Selection */}
          <div className="space-y-2">
            <Label htmlFor="model">Model</Label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger id="model">
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {getModels().map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    <div className="flex items-center gap-2">
                      <span>{m.label}</span>
                      {m.badge && (
                        <Badge variant="secondary" className="ml-auto text-xs">
                          {m.badge}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* API Key Input */}
          <div className="space-y-2">
            <Label htmlFor="apiKey">
              API Key {provider !== currentConfig?.provider && <span className="text-red-500">*</span>}
            </Label>
            <Input
              id="apiKey"
              type="password"
              placeholder={
                provider === currentConfig?.provider
                  ? "Leave blank to keep existing key"
                  : `Enter your ${provider === "openai" ? "OpenAI" : "Anthropic"} API key`
              }
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              {provider === "openai"
                ? "Get your API key from platform.openai.com"
                : "Get your API key from console.anthropic.com"}
            </p>
          </div>

          {/* Model Information */}
          <div className="rounded-lg bg-muted p-3 text-sm">
            <h4 className="font-medium mb-2">Model Information</h4>
            {provider === "openai" && (
              <ul className="space-y-1 text-muted-foreground">
                <li>• GPT-4o: Most capable, multimodal</li>
                <li>• GPT-4o Mini: Fast and cost-effective</li>
                <li>• GPT-4 Turbo: High performance</li>
              </ul>
            )}
            {provider === "anthropic" && (
              <ul className="space-y-1 text-muted-foreground">
                <li>• Sonnet 4.5: Best for coding and agents (NEW)</li>
                <li>• Opus 4.1: Most capable reasoning (NEW)</li>
                <li>• Haiku 4.5: Fastest, low latency (NEW)</li>
                <li>• Claude 3.5: Previous generation</li>
              </ul>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Message */}
          {success && (
            <Alert className="border-green-600 bg-green-50 dark:bg-green-950">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                Configuration saved successfully!
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


