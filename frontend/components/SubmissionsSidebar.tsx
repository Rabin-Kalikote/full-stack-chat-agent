"use client";

import { fetcher } from "@/utils/fetcher";
import { useState } from "react";
import useSWR from "swr";

interface FormSubmission {
  id: string;
  created_at: string;
  chat_id: string;
  name: string;
  phone_number: string;
  email: string;
  status: number | null;
}

const statusMap: Record<number, { label: string; badgeClass: string }> = {
  1: { label: "TO DO", badgeClass: "bg-amber-100 text-amber-800 border-amber-300" },
  2: { label: "IN PROGRESS", badgeClass: "bg-blue-100 text-blue-800 border-blue-300" },
  3: { label: "COMPLETED", badgeClass: "bg-emerald-100 text-emerald-800 border-emerald-300" },
};

function StatusBadge({ status }: { status: number | null }) {
  if (status !== null && statusMap[status]) {
    const s = statusMap[status];
    return (
      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold border ${s.badgeClass}`}>
        {s.label}
      </span>
    );
  }
  return (
    <span className="text-[10px] px-2 py-0.5 rounded-md font-semibold border bg-gray-100 text-gray-600 border-gray-200">
      UNSET
    </span>
  );
}

export default function SubmissionsSidebar({
  chatId,
  onRefresh,
  onClose,
}: {
  chatId?: string;
  onRefresh?: () => void;
  onClose?: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editStatus, setEditStatus] = useState<number | null>(null);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const queryUrl = chatId
    ? `chat/${chatId}/forms${statusFilter ? `?status=${statusFilter}` : ""}`
    : null;

  const { data: forms, mutate } = useSWR<FormSubmission[]>(
    queryUrl ? { url: queryUrl } : null,
    fetcher
  );

  async function handleQuickStatusChange(form: FormSubmission, newStatus: number | null) {
    setIsActionLoading(true);
    try {
      await fetch(`http://localhost:8000/form/${form.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      mutate();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error updating status:", err);
    } finally {
      setIsActionLoading(false);
    }
  }

  async function handleDelete(formId: string) {
    if (!confirm("Are you sure you want to delete this form submission?")) return;
    setIsActionLoading(true);
    try {
      await fetch(`http://localhost:8000/form/${formId}`, {
        method: "DELETE",
      });
      mutate();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error deleting form:", err);
    } finally {
      setIsActionLoading(false);
    }
  }

  function startEditing(form: FormSubmission) {
    setEditingId(form.id);
    setEditName(form.name);
    setEditEmail(form.email);
    setEditPhone(form.phone_number);
    setEditStatus(form.status);
  }

  async function handleSaveEdit(formId: string) {
    setIsActionLoading(true);
    try {
      await fetch(`http://localhost:8000/form/${formId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName,
          email: editEmail,
          phone_number: editPhone,
          status: editStatus,
        }),
      });
      setEditingId(null);
      mutate();
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Error updating form:", err);
    } finally {
      setIsActionLoading(false);
    }
  }

  return (
    <aside className="w-full h-full lg:w-96 flex flex-col bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden">
      {/* Top Header */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
        <div className="flex items-center space-x-2">
          <h2 className="text-sm font-semibold text-gray-900">Interest Submissions</h2>
          {chatId && (
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
              {forms ? forms.length : 0}
            </span>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {chatId && (
            <button
              onClick={() => {
                mutate();
                if (onRefresh) onRefresh();
              }}
              className="text-xs text-blue-600 hover:text-blue-800 transition-colors"
            >
              Refresh
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="lg:hidden p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-200 rounded-lg text-sm"
              aria-label="Close submissions"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Status Filter Bar for active chats */}
      {chatId && (
        <div className="px-3 py-2 bg-gray-50 border-b border-gray-100 flex items-center justify-between text-xs">
          <span className="text-gray-500 font-medium">Filter by status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-white border border-gray-200 rounded-md px-2 py-1 text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="">All statuses</option>
            <option value="1">TO DO (1)</option>
            <option value="2">IN PROGRESS (2)</option>
            <option value="3">COMPLETED (3)</option>
          </select>
        </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-50/30">
        {!chatId ? (
          /* Empty by default on home / when no chat is open */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
            <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 mb-3 text-xl">
              📋
            </div>
            <p className="text-sm font-medium text-gray-600">No chat selected</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[220px]">
              Select an existing chat or start a new one to view its collected interest forms.
            </p>
          </div>
        ) : !forms || forms.length === 0 ? (
          /* Empty state for an active chat with no submissions */
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-gray-400">
            <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 mb-3 text-xl">
              📝
            </div>
            <p className="text-sm font-medium text-gray-700">
              {statusFilter ? "No submissions match this filter" : "No submissions yet"}
            </p>
            <p className="text-xs text-gray-500 mt-1 max-w-[220px]">
              {statusFilter
                ? "Try selecting 'All statuses' above."
                : 'Tell the assistant: "I want to submit an interest form" to collect one.'}
            </p>
          </div>
        ) : (
          /* List of submissions */
          forms.map((form) => {
            const isEditing = editingId === form.id;
            const date = new Date(
              form.created_at + (form.created_at.endsWith("Z") ? "" : "Z")
            );

            if (isEditing) {
              return (
                <div
                  key={form.id}
                  className="p-3.5 bg-white rounded-lg border-2 border-blue-400 shadow-sm space-y-2.5"
                >
                  <div className="text-xs font-semibold text-gray-800">Edit Form Submission</div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full text-xs p-1.5 border border-gray-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Email</label>
                    <input
                      type="email"
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full text-xs p-1.5 border border-gray-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Phone Number</label>
                    <input
                      type="text"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full text-xs p-1.5 border border-gray-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 block mb-0.5">Status</label>
                    <select
                      value={editStatus === null ? "" : editStatus}
                      onChange={(e) =>
                        setEditStatus(e.target.value === "" ? null : Number(e.target.value))
                      }
                      className="w-full text-xs p-1.5 border border-gray-200 rounded bg-white"
                    >
                      <option value="">None / Unset</option>
                      <option value="1">1 - TO DO</option>
                      <option value="2">2 - IN PROGRESS</option>
                      <option value="3">3 - COMPLETED</option>
                    </select>
                  </div>
                  <div className="flex justify-end space-x-2 pt-1">
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => setEditingId(null)}
                      className="px-2.5 py-1 text-xs border border-gray-200 rounded hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={isActionLoading}
                      onClick={() => handleSaveEdit(form.id)}
                      className="px-2.5 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      Save
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={form.id}
                className="p-3.5 bg-white rounded-lg border border-gray-200 shadow-2xs hover:border-blue-300 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{form.name}</h3>
                  <div className="flex items-center space-x-1.5">
                    <StatusBadge status={form.status} />
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-gray-600">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-gray-400 font-medium">Email:</span>
                    <span className="font-mono text-gray-800 break-all">{form.email}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-gray-400 font-medium">Phone:</span>
                    <span className="font-mono text-gray-800">{form.phone_number}</span>
                  </div>

                  {/* Status Quick Select */}
                  <div className="flex items-center space-x-2 pt-1.5">
                    <span className="text-gray-400 text-[10px] font-medium">Status:</span>
                    <select
                      disabled={isActionLoading}
                      value={form.status === null ? "" : form.status}
                      onChange={(e) =>
                        handleQuickStatusChange(
                          form,
                          e.target.value === "" ? null : Number(e.target.value)
                        )
                      }
                      className="text-[11px] bg-gray-50 border border-gray-200 rounded px-1.5 py-0.5 text-gray-700 hover:border-blue-400 focus:outline-none"
                    >
                      <option value="">None</option>
                      <option value="1">1 - TO DO</option>
                      <option value="2">2 - IN PROGRESS</option>
                      <option value="3">3 - COMPLETED</option>
                    </select>
                  </div>

                  {/* Card Footer with Edit & Delete Actions */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                    <span className="font-mono" title={form.id}>
                      ID: {form.id.slice(0, 8)}...
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => startEditing(form)}
                        className="text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Edit
                      </button>
                      <span>•</span>
                      <button
                        onClick={() => handleDelete(form.id)}
                        className="text-red-500 hover:text-red-700 font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
