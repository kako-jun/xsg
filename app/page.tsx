"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import PatternDisplay from "@/components/PatternDisplay";

function PatternPage() {
  const searchParams = useSearchParams();
  const pattern = searchParams.get("pattern") || "colorbar";

  return <PatternDisplay pattern={pattern} />;
}

export default function Page() {
  return (
    <Suspense fallback={<div className="w-screen h-screen bg-black" />}>
      <PatternPage />
    </Suspense>
  );
}
