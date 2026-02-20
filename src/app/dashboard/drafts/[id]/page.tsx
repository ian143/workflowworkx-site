"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CarouselSlide {
  id: string;
  slideNumber: number;
  headline: string;
  content: string;
}

interface DraftDetail {
  id: string;
  lengthType: string;
  content: string;
  score: number | null;
  status: string;
  spark: {
    sparkText: string;
    pipelineItem: {
      project: { name: string };
      forensicBrief: string | null;
    };
  };
  carouselSlides: CarouselSlide[];
}

export default function DraftEditorPage() {
  const params = useParams();
  const router = useRouter();
  const [draft, setDraft] = useState<DraftDetail | null>(null);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/drafts/${params.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          setDraft(data);
          setContent(data.content);
        }
      });
  }, [params.id]);

  async function handleSave() {
    setSaving(true);
    await fetch(`/api/drafts/${params.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    setSaving(false);
  }

  async function handlePublish() {
    const res = await fetch(`/api/drafts/${params.id}/publish`, {
      method: "POST",
    });
    if (res.ok) {
      router.push("/dashboard/publish");
    }
  }

  if (!draft) {
    return (
      <div className="text-sage-600">Loading...</div>
    );
  }

  return (
    <div>
      <button
        onClick={() => router.back()}
        className="text-sm text-sage-600 hover:text-black mb-4 transition-colors"
      >
        &larr; Back to drafts
      </button>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-2xl font-bold">Edit Draft</h1>
        <span className="text-xs px-2 py-1 rounded-full bg-sage-100 text-sage-600 capitalize">
          {draft.lengthType}
        </span>
        {draft.score !== null && (
          <span
            className={`text-sm font-mono ${
              draft.score >= 70 ? "text-green-600" : "text-red-600"
            }`}
          >
            Score: {draft.score}/100
          </span>
        )}
      </div>

      <p className="text-sm text-sage-600 mb-6">
        {draft.spark.pipelineItem.project.name} &middot; &ldquo;
        {draft.spark.sparkText}&rdquo;
      </p>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={20}
            className="w-full bg-white border border-sage-200 rounded-xl px-4 py-3 text-black text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-sage-500 resize-none"
          />
          <div className="flex justify-between items-center mt-3">
            <span className="text-xs text-sage-500">
              {content.length} characters
            </span>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-sage-100 hover:bg-sage-200 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save"}
              </button>
              {draft.status === "draft" && (
                <button
                  onClick={handlePublish}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Publish to LinkedIn
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Carousel preview */}
        {draft.carouselSlides.length > 0 && (
          <div>
            <h2 className="text-lg font-bold mb-3">Carousel Preview</h2>
            <div className="space-y-3">
              {draft.carouselSlides
                .sort((a, b) => a.slideNumber - b.slideNumber)
                .map((slide) => (
                  <div
                    key={slide.id}
                    className="glass rounded-lg p-4"
                  >
                    <span className="text-xs text-sage-600 font-mono">
                      Slide {slide.slideNumber}
                    </span>
                    <h3 className="font-bold mt-1">{slide.headline}</h3>
                    <p className="text-sm text-sage-700 mt-1">
                      {slide.content}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
