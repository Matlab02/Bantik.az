"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

export function LoginForm() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const router = useRouter();

  return (
    <form
      className="mt-9 space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");
        setPending(true);
        const form = new FormData(event.currentTarget);
        const result = await signIn("credentials", {
          email: form.get("email"),
          password: form.get("password"),
          redirect: false,
        });
        if (result?.error) {
          setError("E-poçt və ya şifrə yanlışdır.");
          setPending(false);
          return;
        }
        router.replace("/admin");
        router.refresh();
      }}
    >
      <label className="block text-xs font-semibold uppercase tracking-wider">
        E-poçt
        <input
          name="email"
          type="email"
          required
          defaultValue="admin@bantik.az"
          autoComplete="username"
          className="mt-2 h-12 w-full border border-black/15 px-4 font-normal normal-case outline-none focus:border-red-600"
        />
      </label>
      <label className="block text-xs font-semibold uppercase tracking-wider">
        Şifrə
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          className="mt-2 h-12 w-full border border-black/15 px-4 outline-none focus:border-red-600"
        />
      </label>
      {error && <p className="text-xs text-red-700">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="h-13 w-full bg-red-700 text-xs font-bold uppercase tracking-[.16em] text-white disabled:opacity-60"
      >
        {pending ? "Yoxlanılır…" : "Daxil ol"}
      </button>
    </form>
  );
}
