"use client";

import { Lock, Loader2 } from "lucide-react";
import { useActionState } from "react";
import { unlockSite, type UnlockSiteState } from "./actions";

type SiteLockFormProps = {
  nextPath: string;
};

const initialState: UnlockSiteState = {};

export function SiteLockForm({ nextPath }: SiteLockFormProps) {
  const [state, formAction, pending] = useActionState(unlockSite, initialState);

  return (
    <form action={formAction} className="mt-8 space-y-4">
      <input name="next" type="hidden" value={nextPath} />
      <label className="block text-sm font-medium text-white/75" htmlFor="site-password">
        Password
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Lock
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/45"
          />
          <input
            autoComplete="current-password"
            autoFocus
            className="h-12 w-full rounded-[8px] border border-white/15 bg-white/10 pl-11 pr-4 text-base text-white outline-none transition placeholder:text-white/35 focus:border-[#ff8ab8] focus:bg-white/[0.14] focus:ring-4 focus:ring-[#ff8ab8]/20"
            disabled={pending}
            id="site-password"
            name="password"
            placeholder="Enter access password"
            type="password"
          />
        </div>
        <button
          className="inline-flex h-12 items-center justify-center gap-2 rounded-[8px] bg-[#ff8ab8] px-5 text-sm font-semibold text-[#1e1120] transition hover:bg-[#ffc1d9] disabled:cursor-not-allowed disabled:opacity-70"
          disabled={pending}
          type="submit"
        >
          {pending ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          Unlock
        </button>
      </div>
      {state.error ? (
        <p className="text-sm font-medium text-[#ffb3c8]" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}

