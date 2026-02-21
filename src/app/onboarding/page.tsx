"use client";

import { useRouter } from "next/navigation";
import { useState, useRef, useEffect, useCallback } from "react";

// ============================================================
// TYPES
// ============================================================

interface Message {
  role: "user" | "assistant";
  content: string;
}

type InterviewState = "welcome" | "interviewing" | "saving" | "error";

const SECTIONS = [
  "Business",
  "Voice DNA",
  "Wins",
  "ICP",
  "Strategy",
] as const;

// ============================================================
// SECTION DETECTION (progress indicator)
// ============================================================

function detectSection(messages: Message[]): number {
  const assistantMessages = messages
    .filter((m) => m.role === "assistant")
    .map((m) => m.content.toLowerCase());

  const recent = assistantMessages.slice(-4).join(" ");
  const all = assistantMessages.join(" ");

  if (recent.includes("brand vault is ready") || recent.includes("```json"))
    return 5;
  if (
    recent.includes("post length") ||
    recent.includes("carousel") ||
    recent.includes("how often") ||
    recent.includes("posting frequency") ||
    recent.includes("format")
  )
    return 4;
  if (
    recent.includes("ideal client") ||
    recent.includes("verbatim") ||
    recent.includes("exact words your client")
  )
    return 3;
  if (
    all.includes("secret math") ||
    all.includes("data bomb") ||
    all.includes("backstage") ||
    all.includes("friction point") ||
    recent.includes("best project") ||
    recent.includes("best work")
  )
    return 2;
  if (
    all.includes("signature phrase") ||
    all.includes("writing style") ||
    all.includes("emoji") ||
    all.includes("banned word") ||
    recent.includes("tone")
  )
    return 1;
  return 0;
}

// ============================================================
// JSON EXTRACTION
// ============================================================

function extractVaultJSON(text: string): Record<string, unknown> | null {
  // Look for ```json ... ``` code fence
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1].trim());
    } catch {
      return null;
    }
  }

  // Fallback: look for a raw JSON object starting with {
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    try {
      return JSON.parse(text.slice(braceStart, braceEnd + 1));
    } catch {
      return null;
    }
  }

  return null;
}

// ============================================================
// COMPONENT
// ============================================================

export default function OnboardingPage() {
  const router = useRouter();
  const [state, setState] = useState<InterviewState>("welcome");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [extractedVault, setExtractedVault] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const currentSection = detectSection(messages);

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Focus input when not streaming
  useEffect(() => {
    if (!isStreaming && state === "interviewing") {
      inputRef.current?.focus();
    }
  }, [isStreaming, state]);

  // ----------------------------------------------------------
  // STREAMING CHAT
  // ----------------------------------------------------------

  const sendMessages = useCallback(
    async (messagesToSend: Message[]) => {
      setIsStreaming(true);
      setStreamingText("");
      setError("");

      try {
        const res = await fetch("/api/vault/interview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: messagesToSend }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

        const decoder = new TextDecoder();
        let accumulated = "";
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                accumulated += parsed.text;
                setStreamingText(accumulated);
              }
              if (parsed.error) {
                throw new Error(parsed.error);
              }
            } catch (e) {
              // Skip malformed SSE lines (not JSON parse errors from the API)
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }

        // Finalize: add the complete assistant message
        const assistantMessage: Message = {
          role: "assistant",
          content: accumulated,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setStreamingText("");

        // Check for vault JSON in the response
        const vault = extractVaultJSON(accumulated);
        if (vault) {
          setExtractedVault(vault);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
      } finally {
        setIsStreaming(false);
      }
    },
    []
  );

  // ----------------------------------------------------------
  // START INTERVIEW
  // ----------------------------------------------------------

  function startInterview() {
    setState("interviewing");
    const trigger: Message = {
      role: "user",
      content: "I'm ready to build my Brand Vault. Let's begin.",
    };
    setMessages([trigger]);
    sendMessages([trigger]);
  }

  // ----------------------------------------------------------
  // SEND USER MESSAGE
  // ----------------------------------------------------------

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;

    const userMessage: Message = { role: "user", content: text };
    const updated = [...messages, userMessage];
    setMessages(updated);
    setInput("");
    sendMessages(updated);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // ----------------------------------------------------------
  // SAVE VAULT
  // ----------------------------------------------------------

  async function handleSaveVault() {
    if (!extractedVault) return;

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/vault", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extractedVault),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save vault");
      }

      // Run audit
      await fetch("/api/vault/audit", { method: "POST" });

      setState("saving");
      // Brief pause to show success, then redirect
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setSaving(false);
    }
  }

  // ----------------------------------------------------------
  // RENDER: WELCOME SCREEN
  // ----------------------------------------------------------

  if (state === "welcome") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-lg text-center">
          <div className="w-16 h-16 rounded-2xl bg-sage-100 border border-sage-300 flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-8 h-8 text-sage-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z"
              />
            </svg>
          </div>

          <h1 className="text-3xl font-bold mb-3">
            Build Your Identity Vault
          </h1>
          <p className="text-sage-700 mb-2 text-lg">
            A 20-minute conversation that captures everything.
          </p>
          <p className="text-sage-600 text-sm mb-8 max-w-md mx-auto">
            Instead of filling out forms, you&apos;ll have a strategic
            conversation with our Brand Vault Architect. It will ask smart
            questions, probe for specifics, and compile your unique voice,
            methodology, and positioning into a structured vault that powers all
            your content.
          </p>

          <div className="grid grid-cols-5 gap-2 mb-8 max-w-md mx-auto">
            {SECTIONS.map((label) => (
              <div
                key={label}
                className="text-xs py-2 px-1 rounded-lg bg-sage-100 text-sage-600 text-center"
              >
                {label}
              </div>
            ))}
          </div>

          <button
            onClick={startInterview}
            className="px-8 py-3 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-base font-medium transition-colors"
          >
            Start Interview
          </button>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // RENDER: SAVING SUCCESS
  // ----------------------------------------------------------

  if (state === "saving") {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-green-100 border border-green-300 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 12.75l6 6 9-13.5"
              />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">
            Vault Saved & Audited
          </h2>
          <p className="text-sage-600">
            Redirecting to your dashboard...
          </p>
        </div>
      </div>
    );
  }

  // ----------------------------------------------------------
  // RENDER: CHAT INTERVIEW
  // ----------------------------------------------------------

  return (
    <div className="min-h-screen flex flex-col">
      {/* Progress bar */}
      <div className="border-b border-sage-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-sm font-medium text-black">
              Brand Vault Interview
            </h1>
            {currentSection < 5 && (
              <span className="text-xs text-sage-600">
                Section {currentSection + 1} of 5
              </span>
            )}
            {currentSection === 5 && (
              <span className="text-xs text-green-600 font-medium">
                Complete
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {SECTIONS.map((label, i) => (
              <div key={label} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-500 ${
                    i < currentSection
                      ? "bg-sage-500"
                      : i === currentSection
                      ? "bg-sage-600 animate-pulse"
                      : "bg-sage-200"
                  }`}
                />
                <p
                  className={`text-[10px] mt-1 text-center transition-colors ${
                    i <= currentSection ? "text-sage-700" : "text-sage-400"
                  }`}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chat messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-sage-600 text-white rounded-br-md"
                    : "glass text-black rounded-bl-md"
                }`}
              >
                <MessageContent content={msg.content} />
              </div>
            </div>
          ))}

          {/* Streaming indicator */}
          {isStreaming && (
            <div className="flex justify-start">
              <div className="max-w-[85%] rounded-2xl rounded-bl-md glass px-4 py-3 text-sm leading-relaxed text-black">
                {streamingText ? (
                  <MessageContent content={streamingText} />
                ) : (
                  <TypingIndicator />
                )}
              </div>
            </div>
          )}

          {/* Vault extracted — Save button */}
          {extractedVault && !saving && (
            <div className="flex justify-center py-4">
              <div className="glass rounded-xl p-6 text-center max-w-sm">
                <div className="w-10 h-10 rounded-full bg-sage-100 border border-sage-300 flex items-center justify-center mx-auto mb-3">
                  <svg
                    className="w-5 h-5 text-sage-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-sage-700 mb-4">
                  Your Brand Vault has been compiled. Save it to power your
                  content engine.
                </p>
                <button
                  onClick={handleSaveVault}
                  disabled={saving}
                  className="px-6 py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 w-full"
                >
                  {saving ? "Saving..." : "Save & Continue to Dashboard"}
                </button>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="flex justify-center">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 max-w-sm">
                {error}
              </div>
            </div>
          )}

          <div ref={chatEndRef} />
        </div>
      </div>

      {/* Input area */}
      {!extractedVault && (
        <div className="border-t border-sage-200 bg-white/80 backdrop-blur-sm sticky bottom-0">
          <div className="max-w-3xl mx-auto px-4 py-3">
            <div className="flex gap-2 items-end">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isStreaming}
                placeholder={
                  isStreaming ? "Waiting for response..." : "Type your answer..."
                }
                rows={1}
                className="flex-1 bg-white border border-sage-200 rounded-xl px-4 py-2.5 text-sm text-black placeholder-sage-400 resize-none focus:outline-none focus:ring-2 focus:ring-sage-500 focus:border-transparent disabled:opacity-50 min-h-[42px] max-h-[120px]"
                style={{
                  height: "auto",
                  overflow: "hidden",
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height =
                    Math.min(target.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
                className="px-4 py-2.5 bg-sage-600 hover:bg-sage-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                  />
                </svg>
              </button>
            </div>
            <p className="text-[10px] text-sage-500 mt-1.5 text-center">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// SUB-COMPONENTS
// ============================================================

function MessageContent({ content }: { content: string }) {
  // Render markdown-lite: bold, line breaks, code blocks
  const parts = content.split(/(```json[\s\S]*?```|```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {parts.map((part, i) => {
        // Code block
        if (part.startsWith("```")) {
          const code = part.replace(/```json?\n?/g, "").replace(/```$/g, "");
          return (
            <pre
              key={i}
              className="bg-sage-100 rounded-lg p-3 text-xs overflow-x-auto font-mono text-sage-800 border border-sage-200"
            >
              {code.trim()}
            </pre>
          );
        }

        // Regular text with basic markdown
        return (
          <div key={i}>
            {part.split("\n").map((line, j) => {
              // Process bold markers
              const processed = line.split(/(\*\*.*?\*\*)/g).map((seg, k) => {
                if (seg.startsWith("**") && seg.endsWith("**")) {
                  return (
                    <strong key={k} className="font-semibold text-black">
                      {seg.slice(2, -2)}
                    </strong>
                  );
                }
                return <span key={k}>{seg}</span>;
              });

              if (!line.trim()) {
                return <br key={j} />;
              }

              // Bullet points
              if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
                return (
                  <div key={j} className="flex gap-2 ml-1">
                    <span className="text-sage-600 shrink-0">&#8226;</span>
                    <span>{processed}</span>
                  </div>
                );
              }

              // Numbered lists
              const numMatch = line.trim().match(/^(\d+)[.)]\s/);
              if (numMatch) {
                return (
                  <div key={j} className="flex gap-2 ml-1">
                    <span className="text-sage-600 shrink-0 tabular-nums">
                      {numMatch[1]}.
                    </span>
                    <span>{processed}</span>
                  </div>
                );
              }

              return <p key={j}>{processed}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-1.5 items-center py-1">
      <div className="w-2 h-2 rounded-full bg-sage-500 animate-bounce [animation-delay:0ms]" />
      <div className="w-2 h-2 rounded-full bg-sage-500 animate-bounce [animation-delay:150ms]" />
      <div className="w-2 h-2 rounded-full bg-sage-500 animate-bounce [animation-delay:300ms]" />
    </div>
  );
}
