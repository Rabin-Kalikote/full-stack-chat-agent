"use client";

import ChatConversation from "@/components/ChatConversation";
import ChatListSidebar from "@/components/ChatListSidebar";
import SubmissionsSidebar from "@/components/SubmissionsSidebar";
import { fetcher } from "@/utils/fetcher";
import { useRouter } from "next/navigation";
import { useState } from "react";
import useSWR from "swr";

export default function HomePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);

  const { mutate: mutateChats } = useSWR({ url: "chat" }, fetcher);

  async function handleStartChat(customPrompt?: string) {
    const textToSend = (customPrompt || input).trim();
    if (!textToSend || isSending) return;

    setIsSending(true);
    const initialUserMessage = { role: "user", content: textToSend };
    setMessages([initialUserMessage]);
    setInput("");

    try {
      // 1. Create a new chat row
      const createResp = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [] }),
      });

      if (!createResp.ok) {
        throw new Error("Failed to create chat");
      }

      const newChat = await createResp.json();
      mutateChats();

      // 2. Send the first message to update the chat
      const updateResp = await fetch(`http://localhost:8000/chat/${newChat.id}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: [initialUserMessage] }),
      });

      if (updateResp.ok) {
        router.push(`/${newChat.id}`);
      } else {
        router.push(`/${newChat.id}`);
      }
    } catch (err) {
      console.error("Error creating chat:", err);
      setIsSending(false);
    }
  }

  return (
    <main className="relative flex h-screen w-screen p-2 sm:p-3 md:p-4 gap-2 sm:gap-3 md:gap-4 bg-neutral-100 overflow-hidden">
      {/* Mobile Drawer Backdrop for Left Sidebar */}
      {isLeftOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsLeftOpen(false)}
          />
          <div className="relative z-10 w-80 max-w-[85vw] h-full p-2">
            <ChatListSidebar onClose={() => setIsLeftOpen(false)} />
          </div>
        </div>
      )}

      {/* Mobile Drawer Backdrop for Right Sidebar */}
      {isRightOpen && (
        <div className="fixed inset-0 z-50 flex justify-end lg:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
            onClick={() => setIsRightOpen(false)}
          />
          <div className="relative z-10 w-84 max-w-[85vw] h-full p-2">
            <SubmissionsSidebar onClose={() => setIsRightOpen(false)} />
          </div>
        </div>
      )}

      {/* 1. Left Sidebar: Visible on desktop */}
      <div className="hidden lg:flex h-full">
        <ChatListSidebar />
      </div>

      {/* 2. Middle Main Bar: New Chat Bot Interface */}
      <section className="flex-1 flex flex-col h-full bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center space-x-2">
            {/* Mobile Left Toggle */}
            <button
              type="button"
              onClick={() => setIsLeftOpen(true)}
              className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded-lg border border-gray-200 flex items-center space-x-1 text-xs font-medium"
              title="View Conversations"
            >
              <span>💬</span>
              <span className="hidden sm:inline">Chats</span>
            </button>

            <div>
              <h1 className="text-sm font-semibold text-gray-900 flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                <span>AI Chat Assistant</span>
              </h1>
              <p className="text-[11px] text-gray-500 hidden sm:block">
                Start a new conversation to collect interest forms
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-[11px] font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
              gpt-4o-mini
            </span>

            {/* Mobile Right Toggle */}
            <button
              type="button"
              onClick={() => setIsRightOpen(true)}
              className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded-lg border border-gray-200 flex items-center space-x-1 text-xs font-medium"
              title="View Submissions"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Forms</span>
            </button>
          </div>
        </div>

        {/* Message Area with Welcome Starter */}
        <ChatConversation
          messages={messages}
          emptyPrompt={
            <div className="max-w-md w-full space-y-5 text-center">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-2xl shadow-sm">
                💬
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Start a New Conversation</h2>
                <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
                  Chat with the assistant to ask questions or submit structured interest forms directly to the database.
                </p>
              </div>

              {/* Quick suggestions */}
              <div className="grid grid-cols-1 gap-2 text-left pt-2">
                <button
                  type="button"
                  onClick={() =>
                    handleStartChat(
                      "Hi! I would like to submit an interest form. My name is Alex Carter, email is alex@example.com, and phone is 555-234-5678."
                    )
                  }
                  className="p-3 text-xs bg-white hover:bg-blue-50/60 border border-gray-200 hover:border-blue-300 rounded-xl transition-all text-gray-700 hover:text-blue-900 shadow-2xs group flex items-start space-x-2"
                >
                  <span className="text-base group-hover:scale-110 transition-transform">📝</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 group-hover:text-blue-900">
                      Submit interest form
                    </p>
                    <p className="text-[11px] text-gray-500 line-clamp-1">
                      Alex Carter, alex@example.com, 555-234-5678
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    handleStartChat("What information do I need to submit an interest form?")
                  }
                  className="p-3 text-xs bg-white hover:bg-blue-50/60 border border-gray-200 hover:border-blue-300 rounded-xl transition-all text-gray-700 hover:text-blue-900 shadow-2xs group flex items-start space-x-2"
                >
                  <span className="text-base group-hover:scale-110 transition-transform">❓</span>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 group-hover:text-blue-900">
                      Ask about required information
                    </p>
                    <p className="text-[11px] text-gray-500">
                      Learn what fields the assistant asks for
                    </p>
                  </div>
                </button>
              </div>
            </div>
          }
        />

        {/* Input Bar */}
        <div className="p-3.5 border-t border-gray-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleStartChat();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Ask anything or say 'I want to submit an interest form'..."
              disabled={isSending}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-gray-50 border border-gray-200 text-gray-900 text-xs sm:text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs sm:text-sm rounded-xl transition-all shadow-xs disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5"
            >
              {isSending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />
                  <span>Starting...</span>
                </>
              ) : (
                <span>Send</span>
              )}
            </button>
          </form>
        </div>
      </section>

      {/* 3. Right Sidebar: Visible on desktop */}
      <div className="hidden lg:flex h-full">
        <SubmissionsSidebar />
      </div>
    </main>
  );
}
