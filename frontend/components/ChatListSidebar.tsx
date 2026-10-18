"use client";

import { fetcher } from "@/utils/fetcher";
import Link from "next/link";
import { useRouter } from "next/navigation";
import useSWR from "swr";

interface ChatItem {
  id: string;
  created_at: string;
  messages: any[];
}

export default function ChatListSidebar({
  activeChatId,
  onClose,
}: {
  activeChatId?: string;
  onClose?: () => void;
}) {
  const router = useRouter();
  const { data: chats, mutate: mutateChats } = useSWR<ChatItem[]>({ url: "chat" }, fetcher);

  async function handleCreateNewChat() {
    if (onClose) onClose();
    router.push("/");
  }

  return (
    <aside className="w-full h-full lg:w-80 flex flex-col bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Conversations</h2>
          <p className="text-xs text-gray-500">
            {chats ? `${chats.length} chat${chats.length === 1 ? "" : "s"}` : "Loading..."}
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleCreateNewChat}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 rounded-lg shadow-xs transition-colors"
            title="Start a new chat"
          >
            <span className="text-sm leading-none font-bold">+</span>
            <span>New Chat</span>
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg text-sm"
              aria-label="Close sidebar"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Chat List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {!chats || chats.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-2 text-lg">
              💬
            </div>
            <p className="text-sm font-medium text-gray-600">No previous chats</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[180px]">
              Click &quot;New Chat&quot; to begin your first conversation.
            </p>
          </div>
        ) : (
          chats.map((chat) => {
            const isActive = chat.id === activeChatId;
            const date = new Date(
              chat.created_at + (chat.created_at.endsWith("Z") ? "" : "Z")
            );

            // Find first user message for title preview
            const firstUserMsg = chat.messages?.find((m) => m.role === "user");
            const previewText = firstUserMsg?.content || "New conversation";

            return (
              <Link
                key={chat.id}
                href={`/${chat.id}`}
                onClick={() => {
                  if (onClose) onClose();
                }}
                className={`group block p-3 rounded-lg border text-left transition-all ${
                  isActive
                    ? "bg-blue-50/80 border-blue-400 text-blue-950 shadow-xs ring-1 ring-blue-400/30"
                    : "bg-white border-transparent hover:bg-gray-50 hover:border-gray-200 text-gray-700"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span
                    className={`font-mono text-xs ${
                      isActive ? "text-blue-700 font-semibold" : "text-gray-500"
                    }`}
                  >
                    #{chat.id.slice(0, 8)}...
                  </span>
                  <span className="text-[10px] text-gray-400">
                    {date.toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <p
                  className={`text-xs truncate font-medium ${
                    isActive ? "text-blue-900" : "text-gray-800"
                  }`}
                >
                  {previewText}
                </p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-gray-400">
                  <span>{chat.messages?.length || 0} messages</span>
                  {isActive && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-800">
                      Active
                    </span>
                  )}
                </div>
              </Link>
            );
          })
        )}
      </div>
    </aside>
  );
}
