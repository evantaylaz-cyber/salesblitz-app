"use client";

import { useEffect, useState, useCallback } from "react";
import { useUser } from "@clerk/nextjs";
import {
  Plus,
  Trash2,
  Edit3,
  Save,
  X,
  Loader2,
  FileText,
  BookOpen,
  Target,
  Shield,
  Users,
  Lightbulb,
  MessageSquare,
  FolderOpen,
  Search,
  Check,
} from "lucide-react";
import AppNav from "@/components/AppNav";
import VoiceTextarea from "@/components/VoiceTextarea";

interface KnowledgeDoc {
  id: string;
  title: string;
  content: string;
  contentPreview?: string;
  contentLength?: number;
  category: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORIES = [
  { value: "product_docs", label: "Product Docs", icon: FileText, color: "blue" },
  { value: "competitive_intel", label: "Competitive Intel", icon: Shield, color: "red" },
  { value: "deal_stories", label: "Deal Stories", icon: Target, color: "green" },
  { value: "icp_definitions", label: "ICP Definitions", icon: Users, color: "green" },
  { value: "methodology", label: "Methodology", icon: Lightbulb, color: "amber" },
  { value: "objection_handling", label: "Objection Handling", icon: MessageSquare, color: "orange" },
  { value: "custom", label: "Custom", icon: FolderOpen, color: "gray" },
];

const CATEGORY_COLORS: Record<string, string> = {
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  red: "bg-red-500/10 text-red-400 border-red-500/20",
  green: "bg-green-500/10 text-green-400 border-green-200",
  emerald: "bg-green-500/10 text-green-400 border-green-200",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  orange: "bg-orange-500/10 text-orange-700 border-orange-200",
  gray: "bg-[#0a0a0a] text-neutral-200 border-[#262626]",
};

function getCategoryMeta(category: string) {
  return CATEGORIES.find((c) => c.value === category) || CATEGORIES[CATEGORIES.length - 1];
}

export default function KnowledgeBasePage() {
  const { isLoaded } = useUser();
  const [docs, setDocs] = useState<KnowledgeDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create/edit state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formCategory, setFormCategory] = useState("custom");
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // View state
  const [viewingDoc, setViewingDoc] = useState<KnowledgeDoc | null>(null);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchDocs = useCallback(async () => {
    try {
      const res = await fetch("/api/knowledge-base");
      if (res.ok) {
        const data = await res.json();
        setDocs(data.documents || []);
      } else {
        setError("Failed to load documents");
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded) fetchDocs();
  }, [isLoaded, fetchDocs]);

  function openCreate() {
    setEditingId(null);
    setFormTitle("");
    setFormContent("");
    setFormCategory("custom");
    setFormError(null);
    setShowForm(true);
    setViewingDoc(null);
  }

  function openEdit(doc: KnowledgeDoc) {
    setEditingId(doc.id);
    setFormTitle(doc.title);
    setFormContent(doc.content);
    setFormCategory(doc.category);
    setFormError(null);
    setShowForm(true);
    setViewingDoc(null);
  }

  async function handleSave() {
    if (!formTitle.trim() || !formContent.trim()) {
      setFormError("Title and content are required");
      return;
    }
    setFormSaving(true);
    setFormError(null);

    try {
      const url = editingId
        ? `/api/knowledge-base/${editingId}`
        : "/api/knowledge-base";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formTitle.trim(),
          content: formContent.trim(),
          category: formCategory,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setShowForm(false);
        setEditingId(null);
        fetchDocs();
      } else {
        setFormError(data.error || "Failed to save");
      }
    } catch {
      setFormError("Network error");
    } finally {
      setFormSaving(false);
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/knowledge-base/${id}`, { method: "DELETE" });
      if (res.ok) {
        setDocs((prev) => prev.filter((d) => d.id !== id));
        if (viewingDoc?.id === id) setViewingDoc(null);
      }
    } catch {
      // Silent fail
    } finally {
      setDeletingId(null);
    }
  }

  async function viewFullDoc(doc: KnowledgeDoc) {
    // If we already have full content from the list, use it
    if (doc.content && doc.content.length > 0) {
      setViewingDoc(doc);
      setShowForm(false);
      return;
    }
    // Otherwise fetch it
    try {
      const res = await fetch(`/api/knowledge-base/${doc.id}`);
      if (res.ok) {
        const data = await res.json();
        setViewingDoc(data.document);
        setShowForm(false);
      }
    } catch {
      // Silent fail
    }
  }

  // Filtered docs
  const filteredDocs = docs.filter((doc) => {
    if (filterCategory && doc.category !== filterCategory) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        doc.title.toLowerCase().includes(q) ||
        (doc.contentPreview || doc.content || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <AppNav currentPage="/knowledge-base" />

      <div className="border-b bg-[#141414]">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div />
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
          >
            <Plus className="h-4 w-4" />
            Add Document
          </button>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-6 py-8">
        {error && (
          <div className="mb-6 rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Intro */}
        <div className="mb-6 rounded-xl border border-emerald-100 bg-emerald-500/10/50 p-4">
          <p className="text-sm text-emerald-300">
            <strong>Your Knowledge Base</strong> feeds directly into every run.
            Add product docs, competitive intel, ICP definitions, deal stories, or
            methodology notes. The more context you provide, the more personalized
            and accurate your deliverables become.
          </p>
        </div>

        {/* Search + Filter */}
        <div className="mb-6 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="w-full rounded-lg border border-[#333333] pl-10 pr-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilterCategory(null)}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                !filterCategory
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-[#141414] text-neutral-300 border-[#333333] hover:bg-[#0a0a0a]"
              }`}
            >
              All ({docs.length})
            </button>
            {CATEGORIES.map((cat) => {
              const count = docs.filter((d) => d.category === cat.value).length;
              if (count === 0) return null;
              return (
                <button
                  key={cat.value}
                  onClick={() =>
                    setFilterCategory(filterCategory === cat.value ? null : cat.value)
                  }
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    filterCategory === cat.value
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-[#141414] text-neutral-300 border-[#333333] hover:bg-[#0a0a0a]"
                  }`}
                >
                  {cat.label} ({count})
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Document List */}
          <div className={`${showForm || viewingDoc ? "lg:col-span-1" : "lg:col-span-3"}`}>
            {filteredDocs.length === 0 && !showForm ? (
              <div className="rounded-xl border-2 border-dashed border-[#262626] p-12 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-neutral-500" />
                <h3 className="mt-4 text-lg font-medium text-white">
                  {docs.length === 0
                    ? "No documents yet"
                    : "No matching documents"}
                </h3>
                <p className="mt-2 text-sm text-neutral-400">
                  {docs.length === 0
                    ? "Add product docs, competitive intel, or deal stories to supercharge your runs."
                    : "Try adjusting your search or filter."}
                </p>
                {docs.length === 0 && (
                  <button
                    onClick={openCreate}
                    className="mt-4 inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition"
                  >
                    <Plus className="h-4 w-4" />
                    Add Your First Document
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredDocs.map((doc) => {
                  const meta = getCategoryMeta(doc.category);
                  const CatIcon = meta.icon;
                  const isActive = viewingDoc?.id === doc.id;
                  return (
                    <div
                      key={doc.id}
                      onClick={() => viewFullDoc(doc)}
                      className={`rounded-xl border bg-[#141414] p-4 cursor-pointer transition hover:shadow-sm shadow-black/20 ${
                        isActive
                          ? "border-emerald-500/30 ring-1 ring-emerald-200"
                          : "border-[#262626] hover:border-[#333333]"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                CATEGORY_COLORS[meta.color]
                              }`}
                            >
                              <CatIcon className="h-3 w-3" />
                              {meta.label}
                            </span>
                            <span className="text-[10px] text-neutral-500">
                              {doc.contentLength
                                ? `${Math.round(doc.contentLength / 100) / 10}K chars`
                                : ""}
                            </span>
                          </div>
                          <h4 className="font-medium text-white truncate">
                            {doc.title}
                          </h4>
                          <p className="mt-1 text-xs text-neutral-400 line-clamp-2">
                            {doc.contentPreview || doc.content?.slice(0, 200)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(doc);
                            }}
                            className="p-1.5 text-neutral-500 hover:text-emerald-400 transition rounded-lg hover:bg-emerald-500/100/10"
                            title="Edit"
                          >
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Delete this document?")) {
                                handleDelete(doc.id);
                              }
                            }}
                            disabled={deletingId === doc.id}
                            className="p-1.5 text-neutral-500 hover:text-red-400 transition rounded-lg hover:bg-red-500/10 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === doc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Panel: Create/Edit Form or Document Viewer */}
          {(showForm || viewingDoc) && (
            <div className="lg:col-span-2">
              {showForm ? (
                <div className="rounded-xl border bg-[#141414] shadow-sm shadow-black/20">
                  <div className="flex items-center justify-between border-b px-6 py-4">
                    <h3 className="font-semibold text-white">
                      {editingId ? "Edit Document" : "New Document"}
                    </h3>
                    <button
                      onClick={() => {
                        setShowForm(false);
                        setEditingId(null);
                      }}
                      className="p-1 text-neutral-500 hover:text-neutral-300 transition"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  <div className="p-6 space-y-4">
                    {formError && (
                      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-400">
                        {formError}
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-neutral-200 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={formTitle}
                        onChange={(e) => setFormTitle(e.target.value)}
                        placeholder="e.g., Product Overview: Enterprise Features"
                        className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-200 mb-1">
                        Category
                      </label>
                      <select
                        value={formCategory}
                        onChange={(e) => setFormCategory(e.target.value)}
                        className="w-full rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-2 text-sm focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
                      >
                        {CATEGORIES.map((cat) => (
                          <option key={cat.value} value={cat.value}>
                            {cat.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-neutral-200 mb-1">
                        Content
                      </label>
                      <VoiceTextarea
                        value={formContent}
                        onChange={setFormContent}
                        placeholder="Paste your document content here. This gets injected into every blitz for personalized, accurate deliverables."
                        rows={16}
                      />
                      <p className="mt-1 text-xs text-neutral-500">
                        {formContent.length.toLocaleString()} / 50,000 characters
                      </p>
                    </div>
                    <div className="flex justify-end gap-3">
                      <button
                        onClick={() => {
                          setShowForm(false);
                          setEditingId(null);
                        }}
                        className="rounded-lg border border-[#333333] bg-[#0a0a0a] px-4 py-2 text-sm font-medium text-neutral-200 hover:bg-[#0a0a0a] transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={formSaving || !formTitle.trim() || !formContent.trim()}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600 transition disabled:opacity-50"
                      >
                        {formSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                        {formSaving ? "Saving..." : editingId ? "Update" : "Save"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : viewingDoc ? (
                <div className="rounded-xl border bg-[#141414] shadow-sm shadow-black/20">
                  <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {(() => {
                          const meta = getCategoryMeta(viewingDoc.category);
                          const CatIcon = meta.icon;
                          return (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                                CATEGORY_COLORS[meta.color]
                              }`}
                            >
                              <CatIcon className="h-3 w-3" />
                              {meta.label}
                            </span>
                          );
                        })()}
                      </div>
                      <h3 className="font-semibold text-white">
                        {viewingDoc.title}
                      </h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEdit(viewingDoc)}
                        className="flex items-center gap-1.5 rounded-lg border border-[#333333] bg-[#0a0a0a] px-3 py-1.5 text-xs font-medium text-neutral-200 hover:bg-[#0a0a0a] transition"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => setViewingDoc(null)}
                        className="p-1 text-neutral-500 hover:text-neutral-300 transition"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                  <div className="p-6">
                    <pre className="whitespace-pre-wrap text-sm text-neutral-200 font-sans leading-relaxed max-h-[600px] overflow-y-auto">
                      {viewingDoc.content}
                    </pre>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
