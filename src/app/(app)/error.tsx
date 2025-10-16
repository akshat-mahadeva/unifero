"use client";

import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

type ErrorProps = {
  error: Error;
  reset: () => void;
};

export default function ErrorPage({ error, reset }: ErrorProps) {
  // In production we wouldn't expose the error message. Keep it for dev/debug.
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-2xl text-center">
        <h1 className="text-4xl font-bold mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-6">
          An unexpected error occurred.
        </p>
        <Badge
          variant={"destructive"}
          className="mb-6 text-left whitespace-pre-wrap"
        >
          {error?.message}
        </Badge>

        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="rounded-md border px-3 py-2"
          >
            Try again
          </button>

          <Link
            href="/"
            className="inline-block rounded-md bg-primary px-4 py-2 text-white"
          >
            Go back home
          </Link>
        </div>
      </div>
    </div>
  );
}
