"use client";

import { useState } from "react";
import Upload from "@/components/Upload";

export default function Home() {
  const [result, setResult] = useState<{
    optimizedUrl: string;
    original: { resolution: string; size: number; fps: number };
    optimized: { resolution: string; size: number };
  } | null>(null);

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100 p-6 dark:from-zinc-900 dark:to-zinc-950">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-50 mb-4">
            ReelsHQ
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            Optimize video for Instagram — preserve sharpness, keep 30fps cap, avoid quality drop
          </p>
        </div>

        <Upload onResult={setResult} />

        {result && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-50">
              Optimization Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                  Original
                </h3>
                <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                  <li>Resolution: {result.original.resolution}</li>
                  <li>Size: {(result.original.size / 1024 / 1024).toFixed(2)} MB</li>
                  <li>FPS: {result.original.fps}</li>
                </ul>
              </div>
              <div className="border rounded-lg p-4 bg-white dark:bg-zinc-900">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-50 mb-2">
                  Optimized
                </h3>
                <ul className="text-sm text-zinc-600 dark:text-zinc-400 space-y-1">
                  <li>Resolution: {result.optimized.resolution}</li>
                  <li>Size: {(result.optimized.size / 1024 / 1024).toFixed(2)} MB</li>
                </ul>
              </div>
            </div>
            <a
              href={result.optimizedUrl}
              download
              className="inline-flex items-center justify-center rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              Download Optimized Video
            </a>
          </div>
        )}
      </div>
    </main>
  );
}