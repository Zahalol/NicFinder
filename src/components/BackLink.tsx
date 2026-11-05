"use client";

import { useRouter } from "next/navigation";

/** Goes back in history when possible, otherwise to the fallback href. */
export function BackLink({
  fallback,
  children,
}: {
  fallback: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        if (window.history.length > 1) router.back();
        else router.push(fallback);
      }}
      className="text-sm text-stone-500 hover:text-stone-900 dark:text-stone-400"
    >
      {children}
    </button>
  );
}
