"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import Logo from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isRegister = searchParams.get("register") === "true";

  const [mode, setMode] = useState<"login" | "register">(
    isRegister ? "register" : "login"
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    if (mode === "register") {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Registration failed");
        setLoading(false);
        return;
      }
    }

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <Link href="/" className="flex justify-center mb-8">
        <Logo size="lg" />
      </Link>

      <div className="glass rounded-xl p-6">
        <h1 className="text-xl font-bold mb-6 text-black">
          {mode === "login" ? "Welcome back" : "Create your account"}
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "register" && (
            <div>
              <label className="block text-sm text-sage-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-sage-200 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-sage-500"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm text-sage-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-white border border-sage-200 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-sage-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm text-sage-700 mb-1">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-white border border-sage-200 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-sage-500"
              minLength={8}
              required
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-sage-600 hover:bg-sage-700 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50"
          >
            {loading
              ? "..."
              : mode === "login"
              ? "Sign In"
              : "Create Account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-sage-700">
          {mode === "login" ? (
            <>
              No account?{" "}
              <button
                onClick={() => setMode("register")}
                className="text-sage-600 font-medium hover:underline"
              >
                Register
              </button>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <button
                onClick={() => setMode("login")}
                className="text-sage-600 font-medium hover:underline"
              >
                Sign in
              </button>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <Suspense fallback={<div className="text-sage-700">Loading...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
