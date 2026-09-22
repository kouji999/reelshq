"use client";

import { useCallback, useState, useRef } from "react";

type Result = {
  optimizedUrl: string;
  original: { resolution: string; size: number; fps: number };
  optimized: { resolution: string; size: number };
};

export default function Upload({
  onResult,
}: {
  onResult: (result: Result) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState<
    "idle" | "uploading" | "processing" | "done" | "error"
  >("idle");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) return;
      const file = files[0];

      if (!file.type.startsWith("video/")) {
        setError("Please upload a video file");
        setStatus("error");
        return;
      }
      if (file.size > 500 * 1024 * 1024) {
        setError("Video too large. 500MB maximum for now.");
        setStatus("error");
        return;
      }

      setStatus("uploading");
      setError("");

      try {
        const form = new FormData();
        form.append("video", file);
        const res = await fetch("/api/upload", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Upload failed");
        }
        const data = await res.json();
        setStatus("processing");
        onResult({
          optimizedUrl: data.optimizedUrl,
          original: data.original,
          optimized: data.optimized,
        });
        setStatus("done");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
        setStatus("error");
      }
    },
    [onResult]
  );

  return (
    <div
      className={`w-full border-2 border-dashed rounded-xl p-10 text-center transition-colors ${
        dragging
          ? "border-zinc-500 bg-zinc-200 dark:bg-zinc-800"
          : "border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-900"
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      {status === "idle" && (
        <>
          <p className="text-zinc-900 dark:text-zinc-50 font-medium mb-2">
            Drag & drop your video here
          </p>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">
            or click to browse — MP4, MOV, up to 500MB
          </p>
        </>
      )}
      {status === "uploading" && (
        <p className="text-zinc-900 dark:text-zinc-50 font-medium">
          Uploading…
        </p>
      )}
      {status === "processing" && (
        <p className="text-zinc-900 dark:text-zinc-50 font-medium">
          Processing video (this can take a moment for large files)…
        </p>
      )}
      {status === "done" && (
        <p className="text-emerald-600 dark:text-emerald-400 font-medium">
          Done. See results below.
        </p>
      )}
      {status === "error" && (
        <>
          <p className="text-red-600 dark:text-red-400 font-medium mb-2">
            Error
          </p>
          <p className="text-zinc-500 dark:text-zinc-400 text-sm">{error}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setStatus("idle");
              setError("");
            }}
            className="mt-3 text-sm text-zinc-900 dark:text-zinc-50 underline"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}