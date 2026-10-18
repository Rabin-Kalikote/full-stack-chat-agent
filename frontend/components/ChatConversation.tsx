"use client";

import { useEffect, useRef } from "react";

function ToolCallCard({ toolCall }: { toolCall: any }) {
  return (
    <div className="max-w-md py-2 px-3 text-xs rounded-xl self-start bg-white border border-blue-200 shadow-xs">
      <div className="flex items-center space-x-1.5 text-blue-900 font-semibold mb-1">
        <span>⚙️</span>
        <span>Calling tool:</span>
        <span className="font-mono bg-blue-50 px-1 py-0.5 rounded text-blue-950">
          {toolCall.function?.name}
        </span>
      </div>
      <pre className="whitespace-pre-wrap font-mono text-[11px] text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 overflow-x-auto">
        {toolCall.function?.arguments}
      </pre>
    </div>
  );
}

function ToolResponseCard({ message }: { message: any }) {
  return (
    <div className="max-w-md py-2 px-3 text-xs rounded-xl self-start bg-emerald-50 border border-emerald-200 text-emerald-950 shadow-xs">
      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 mb-0.5 flex items-center space-x-1">
        <span>✓</span>
        <span>Tool Response</span>
      </div>
      <div className="whitespace-pre-wrap font-mono text-[11px]">{message.content}</div>
    </div>
  );
}

export default function ChatConversation({
  messages,
  emptyPrompt,
}: {
  messages: any[];
  emptyPrompt?: React.ReactNode;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  if (!messages || messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gray-50/50">
        {emptyPrompt || (
          <div className="max-w-md space-y-2 text-gray-500">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-50 flex items-center justify-center text-blue-600 text-xl font-bold">
              🤖
            </div>
            <h3 className="text-base font-semibold text-gray-800">AI Assistant Ready</h3>
            <p className="text-xs text-gray-500">
              Type a message below to start chatting and collecting structured interest forms.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/40 flex flex-col">
      {messages.map((m: any, i: number) => {
        if (m.role === "user") {
          return (
            <div
              key={`msg_${i}`}
              className="max-w-lg py-2.5 px-4 text-sm rounded-2xl rounded-tr-sm shadow-xs self-end bg-blue-600 text-white leading-relaxed"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-100 mb-1">
                You
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          );
        }

        if (m.role === "assistant") {
          if (m.tool_calls) {
            return (
              <div key={`msg_${i}`} className="flex flex-col items-start space-y-2 self-start w-full">
                {m.tool_calls.map((tc: any, tcIdx: number) => (
                  <ToolCallCard key={`tc_${tcIdx}`} toolCall={tc} />
                ))}
              </div>
            );
          }
          return (
            <div
              key={`msg_${i}`}
              className="max-w-lg py-2.5 px-4 text-sm rounded-2xl rounded-tl-sm shadow-xs self-start bg-white border border-gray-200 text-gray-900 leading-relaxed"
            >
              <div className="text-[10px] font-bold uppercase tracking-wider text-blue-600 mb-1">
                Assistant
              </div>
              <div className="whitespace-pre-wrap">{m.content}</div>
            </div>
          );
        }

        if (m.role === "tool") {
          return <ToolResponseCard key={`msg_${i}`} message={m} />;
        }

        return null;
      })}
      <div ref={bottomRef} />
    </div>
  );
}
