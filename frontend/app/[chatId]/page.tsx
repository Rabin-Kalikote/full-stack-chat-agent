"use client";

import ChatConversation from "@/components/ChatConversation";
import ChatListSidebar from "@/components/ChatListSidebar";
import SubmissionsSidebar from "@/components/SubmissionsSidebar";
import { fetcher } from "@/utils/fetcher";
import { useEffect, useState } from "react";
import useSWR from "swr";

export default function ChatDetailPage({ params }: { params: { chatId: string } }) {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [isLeftOpen, setIsLeftOpen] = useState(false);
  const [isRightOpen, setIsRightOpen] = useState(false);

  const { data: chatData, mutate: mutateChat } = useSWR(
    { url: `chat/${params.chatId}` },
    fetcher
  );
  const { data: forms, mutate: mutateForms } = useSWR(
    { url: `chat/${params.chatId}/forms` },
    fetcher
  );
  const { mutate: mutateChats } = useSWR({ url: "chat" }, fetcher);

  useEffect(() => {
    if (chatData?.messages) {
      setMessages(chatData.messages);
    }
  }, [chatData]);

  async function generateResponse() {
    const textToSend = input.trim();
    if (!textToSend || isSending) return;

    const newMessages = [...messages, { role: "user", content: textToSend }];
    setMessages(newMessages);
    setInput("");
    setIsSending(true);

    try {
      const resp = await fetch(`http://localhost:8000/chat/${params.chatId}`, {
        method: "PUT",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (resp.ok) {
        const json = await resp.json();
        setMessages(json.messages);
        // Refresh forms and chat lists
        mutateForms();
        mutateChats();
      }
    } catch (err) {
      console.error("Failed to update chat:", err);
    } finally {
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
            <ChatListSidebar
              activeChatId={params.chatId}
              onClose={() => setIsLeftOpen(false)}
            />
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
            <SubmissionsSidebar
              chatId={params.chatId}
              onRefresh={() => mutateForms()}
              onClose={() => setIsRightOpen(false)}
            />
          </div>
        </div>
      )}

      {/* 1. Left Sidebar: Visible on desktop */}
      <div className="hidden lg:flex h-full">
        <ChatListSidebar activeChatId={params.chatId} />
      </div>

      {/* 2. Middle Main Bar: Active Chat Conversation */}
      <section className="flex-1 flex flex-col h-full bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden min-w-0">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
          <div className="flex items-center space-x-2 sm:space-x-3">
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
              <h1 className="text-sm font-semibold text-gray-900 flex items-center space-x-1.5">
                <span>Chat</span>
                <span className="font-mono text-xs font-normal text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded max-w-[120px] sm:max-w-none truncate">
                  #{params.chatId.slice(0, 10)}...
                </span>
              </h1>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <div className="text-xs text-gray-400 hidden sm:block">
              {messages.length} msg{messages.length === 1 ? "" : "s"}
            </div>

            {/* Mobile Right Toggle with Submissions Count Badge */}
            <button
              type="button"
              onClick={() => setIsRightOpen(true)}
              className="lg:hidden p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-200/70 rounded-lg border border-gray-200 flex items-center space-x-1 text-xs font-medium"
              title="View Submissions"
            >
              <span>📋</span>
              <span className="hidden sm:inline">Forms</span>
              {forms && forms.length > 0 && (
                <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 text-[10px] font-bold rounded-full">
                  {forms.length}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Message Stream */}
        <ChatConversation messages={messages} />

        {/* Input Bar */}
        <div className="p-3.5 border-t border-gray-100 bg-white">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generateResponse();
            }}
            className="flex items-center space-x-2"
          >
            <input
              type="text"
              placeholder="Continue the conversation..."
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
                  <span>Thinking...</span>
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
        <SubmissionsSidebar
          chatId={params.chatId}
          onRefresh={() => mutateForms()}
        />
      </div>
    </main>
  );
}
