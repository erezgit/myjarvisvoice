import { useMutation } from "@tanstack/react-query";
import { CircleX, Columns2, Copy, EyeOff, Key, Pencil, Save, Terminal, Bot } from "lucide-react";
import {
  Form,
  useDataProvider,
  useGetIdentity,
  useGetOne,
  useNotify,
  useRecordContext,
} from "ra-core";
import { useState, useEffect, useCallback } from "react";
import { useFormState } from "react-hook-form";
import { RecordField } from "@/components/admin/record-field";
import { TextInput } from "@/components/admin/text-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import ImageEditorField from "../misc/ImageEditorField";
import type { CrmDataProvider } from "../providers/types";
import type { Member, MemberFormData } from "../types";
import { useSettings } from "../chat/hooks/useSettings";
import React from "react";

const isSqliteMode = import.meta.env.VITE_APP_MODE === "sqlite";

export const SettingsPage = () => {
  if (isSqliteMode) {
    return <DesktopSettingsPage />;
  }

  return <CloudSettingsPage />;
};

/** Desktop/SQLite mode settings — API keys + model selector */
const DesktopSettingsPage = () => {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [model, setModel] = useState("claude-sonnet-4-20250514");
  const [saved, setSaved] = useState(false);
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showOpenaiKey, setShowOpenaiKey] = useState(false);

  // Load saved settings from localStorage
  useEffect(() => {
    try {
      const settings = localStorage.getItem("myjarvis-desktop-settings");
      if (settings) {
        const parsed = JSON.parse(settings);
        if (parsed.anthropicKey) setAnthropicKey(parsed.anthropicKey);
        if (parsed.openaiKey) setOpenaiKey(parsed.openaiKey);
        if (parsed.model) setModel(parsed.model);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  const handleSave = useCallback(() => {
    localStorage.setItem("myjarvis-desktop-settings", JSON.stringify({
      anthropicKey,
      openaiKey,
      model,
    }));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [anthropicKey, openaiKey, model]);

  return (
    <div className="px-6 pt-4 pb-6 max-w-5xl space-y-6">
      {/* API Keys */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Key className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-muted-foreground">API Keys</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                Anthropic API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showAnthropicKey ? "text" : "password"}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAnthropicKey(!showAnthropicKey)}
                >
                  {showAnthropicKey ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Required for chat and automations</p>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground block mb-1.5">
                OpenAI API Key
              </label>
              <div className="flex gap-2">
                <input
                  type={showOpenaiKey ? "text" : "password"}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  className="flex-1 h-9 px-3 rounded-md border border-input bg-background text-sm"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowOpenaiKey(!showOpenaiKey)}
                >
                  {showOpenaiKey ? "Hide" : "Show"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Required for voice generation</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Selection */}
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-muted-foreground" />
            <h2 className="text-xl font-semibold text-muted-foreground">Model</h2>
          </div>
          <div>
            <label className="text-sm font-medium text-muted-foreground block mb-1.5">
              Claude Model
            </label>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="h-9 px-3 rounded-md border border-input bg-background text-sm w-full max-w-xs"
            >
              <option value="claude-opus-4-6">Claude Opus 4.6 (most capable)</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (balanced)</option>
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (fastest)</option>
            </select>
            <p className="text-xs text-muted-foreground mt-1">
              Opus is most capable but costs more. Sonnet is the best balance of speed and quality.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} variant="outline" className="flex items-center gap-2">
          <Save className="w-4 h-4" />
          {saved ? "Saved!" : "Save Settings"}
        </Button>
      </div>

      <ParallelChatSection />
    </div>
  );
};

/** Cloud mode settings — original Supabase-based profile */
const CloudSettingsPage = () => {
  const [isEditMode, setEditMode] = useState(false);
  const { identity, refetch: refetchIdentity } = useGetIdentity();
  const { data, refetch: refetchUser } = useGetOne("members", {
    id: identity?.id,
  });
  const notify = useNotify();
  const dataProvider = useDataProvider<CrmDataProvider>();

  const { mutate } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: MemberFormData) => {
      if (!identity) {
        throw new Error("Record not found");
      }
      return dataProvider.membersUpdate(identity.id, data);
    },
    onSuccess: () => {
      refetchIdentity();
      refetchUser();
      setEditMode(false);
      notify("Your profile has been updated");
    },
    onError: (_) => {
      notify("An error occurred. Please try again", {
        type: "error",
      });
    },
  });

  if (!identity) return null;

  const handleOnSubmit = async (values: any) => {
    mutate(values);
  };

  return (
    <div className="px-6 pt-4 pb-6 max-w-5xl space-y-6">
      <Form onSubmit={handleOnSubmit} record={data}>
        <SettingsForm isEditMode={isEditMode} setEditMode={setEditMode} />
      </Form>
      <ParallelChatSection />
      <AppConnectionsSection />
      <TerminalSection />
    </div>
  );
};

const SettingsForm = ({
  isEditMode,
  setEditMode,
}: {
  isEditMode: boolean;
  setEditMode: (value: boolean) => void;
}) => {
  const notify = useNotify();
  const record = useRecordContext<Member>();
  const { identity, refetch } = useGetIdentity();
  const { isDirty } = useFormState();
  const dataProvider = useDataProvider<CrmDataProvider>();

  const { mutate: updatePassword } = useMutation({
    mutationKey: ["updatePassword"],
    mutationFn: async () => {
      if (!identity) {
        throw new Error("Record not found");
      }
      return dataProvider.updatePassword(identity.id);
    },
    onSuccess: () => {
      notify("A reset password email has been sent to your email address");
    },
    onError: (e) => {
      notify(`${e}`, {
        type: "error",
      });
    },
  });

  const { mutate: mutateMember } = useMutation({
    mutationKey: ["signup"],
    mutationFn: async (data: MemberFormData) => {
      if (!record) {
        throw new Error("Record not found");
      }
      return dataProvider.membersUpdate(record.id, data);
    },
    onSuccess: () => {
      refetch();
      notify("Your profile has been updated");
    },
    onError: () => {
      notify("An error occurred. Please try again.");
    },
  });
  if (!identity) return null;

  const handleClickOpenPasswordChange = () => {
    updatePassword();
  };

  const handleAvatarUpdate = async (values: any) => {
    mutateMember(values);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent>
          <div className="mb-4 flex flex-row justify-between">
            <h2 className="text-xl font-semibold text-muted-foreground">
              My info
            </h2>
          </div>

          <div className="space-y-4 mb-4">
            <ImageEditorField
              source="avatar"
              type="avatar"
              onSave={handleAvatarUpdate}
              linkPosition="right"
            />
            <TextRender source="first_name" isEditMode={isEditMode} />
            <TextRender source="last_name" isEditMode={isEditMode} />
            <TextRender source="email" isEditMode={isEditMode} />
          </div>

          <div className="flex flex-row justify-end gap-2">
            {!isEditMode && (
              <>
                <Button
                  variant="outline"
                  type="button"
                  onClick={handleClickOpenPasswordChange}
                >
                  Change password
                </Button>
              </>
            )}

            <Button
              type="button"
              variant={isEditMode ? "ghost" : "outline"}
              onClick={() => setEditMode(!isEditMode)}
              className="flex items-center"
            >
              {isEditMode ? <CircleX /> : <Pencil />}
              {isEditMode ? "Cancel" : "Edit"}
            </Button>

            {isEditMode && (
              <Button type="submit" disabled={!isDirty} variant="outline">
                <Save />
                Save
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
      {import.meta.env.VITE_INBOUND_EMAIL && (
        <Card>
          <CardContent>
            <div className="space-y-4 justify-between">
              <h2 className="text-xl font-semibold text-muted-foreground">
                Inbound email
              </h2>
              <p className="text-sm text-muted-foreground">
                You can start sending emails to your server's inbound email
                address, e.g. by adding it to the
                <b> Cc: </b> field. Atomic CRM will process the emails and add
                notes to the corresponding contacts.
              </p>
              <CopyPaste />
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const TextRender = ({
  source,
  isEditMode,
}: {
  source: string;
  isEditMode: boolean;
}) => {
  if (isEditMode) {
    return <TextInput source={source} helperText={false} />;
  }
  return (
    <div className="m-2">
      <RecordField source={source} />
    </div>
  );
};

const CopyPaste = () => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    setCopied(true);
    navigator.clipboard.writeText(import.meta.env.VITE_INBOUND_EMAIL);
    setTimeout(() => {
      setCopied(false);
    }, 1500);
  };
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            onClick={handleCopy}
            variant="ghost"
            className="normal-case justify-between w-full"
          >
            <span className="overflow-hidden text-ellipsis">
              {import.meta.env.VITE_INBOUND_EMAIL}
            </span>
            <Copy className="h-4 w-4 ml-2" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? "Copied!" : "Copy"}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

/** Chat settings: visibility toggle + parallel chat toggle */
const ParallelChatSection = () => {
  const { parallelChat, toggleParallelChat, chatVisible, toggleChatVisible } = useSettings();

  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-semibold text-muted-foreground mb-4">
          Chat
        </h2>
        <div className="space-y-2">
          <button
            onClick={toggleChatVisible}
            className="flex items-center gap-3 px-4 py-3 bg-muted/50 border rounded-lg hover:bg-muted transition-colors text-left w-full"
          >
            <EyeOff className={`w-5 h-5 ${!chatVisible ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <div className="text-sm font-medium">Hide chat panel</div>
              <div className="text-xs text-muted-foreground">
                Hide the chat panel on the right side of the screen
              </div>
            </div>
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                !chatVisible ? 'bg-blue-500' : 'bg-muted-foreground/30'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  !chatVisible ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
          </button>
          <button
            onClick={toggleParallelChat}
            className="flex items-center gap-3 px-4 py-3 bg-muted/50 border rounded-lg hover:bg-muted transition-colors text-left w-full"
          >
            <Columns2 className={`w-5 h-5 ${parallelChat ? 'text-blue-500' : 'text-muted-foreground'}`} />
            <div className="flex-1">
              <div className="text-sm font-medium">Parallel chat</div>
              <div className="text-xs text-muted-foreground">
                Split the chat panel to run multiple conversations at once
              </div>
            </div>
            <div
              className={`w-10 h-6 rounded-full transition-colors relative ${
                parallelChat ? 'bg-blue-500' : 'bg-muted-foreground/30'
              }`}
            >
              <div
                className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-transform ${
                  parallelChat ? 'translate-x-5' : 'translate-x-1'
                }`}
              />
            </div>
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

/** Terminal access */
const TerminalSection = () => {
  const { toggleTerminal } = useSettings();

  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-semibold text-muted-foreground mb-4">
          Terminal
        </h2>
        <button
          onClick={() => toggleTerminal?.()}
          className="flex items-center gap-3 px-4 py-3 bg-muted/50 border rounded-lg hover:bg-muted transition-colors text-left w-full"
        >
          <Terminal className="w-5 h-5 text-emerald-500" />
          <div className="flex-1">
            <div className="text-sm font-medium">Open terminal</div>
            <div className="text-xs text-muted-foreground">Access the agent terminal for CLI operations and login</div>
          </div>
        </button>
      </CardContent>
    </Card>
  );
};

/** Composio app connections (cloud mode only) */
const AppConnectionsSection = () => {
  const [Grid, setGrid] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    if (!isSqliteMode) {
      import("@/components/desktop/settings/AppConnectionsGrid").then((mod) => {
        setGrid(() => mod.AppConnectionsGrid);
      });
    }
  }, []);

  if (!Grid) return null;

  return (
    <Card>
      <CardContent>
        <h2 className="text-xl font-semibold text-muted-foreground mb-4">
          App Connections
        </h2>
        <Grid />
      </CardContent>
    </Card>
  );
};

SettingsPage.path = "/settings";
