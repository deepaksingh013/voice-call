"use client";

import Link from "next/link";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <main className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-surface text-slate">
        <SearchX size={24} strokeWidth={1.9} />
      </span>
      <h1 className="mt-5 text-[20px] font-bold tracking-tight text-chalk">
        Nothing here
      </h1>
      <p className="mt-2 text-[12.5px] leading-relaxed text-slate">
        That screen does not exist. The call button does.
      </p>
      <Link
        href="/talk"
        className="tap mt-6 rounded-2xl bg-mint px-6 py-3 text-[14px] font-semibold text-ink"
      >
        Back to calling
      </Link>
    </main>
  );
}
