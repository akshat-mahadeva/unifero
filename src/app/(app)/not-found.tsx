import Link from "next/link";
import React from "react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="max-w-md text-center">
        <h1 className="text-4xl font-bold mb-4">404 — Page not found</h1>
        <p className="text-muted-foreground mb-6">
          We couldn&apos;t find the page you&apos;re looking for.
        </p>
        <Link
          href="/"
          className="inline-block rounded-md bg-primary px-4 py-2 text-white"
        >
          Go back home
        </Link>
      </div>
    </div>
  );
}
