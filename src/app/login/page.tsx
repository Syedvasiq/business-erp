"use client";
import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { Manrope } from "next/font/google";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});

type FormData = { email: string; password: string; remember: boolean };

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from") ?? "/";

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>();

  const onSubmit = async (data: FormData) => {
    setServerError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (res.ok) {
      router.push(from);
      router.refresh();
    } else {
      const json = await res.json();
      setServerError(json.error ?? "We couldn't sign you in. Check your details and try again.");
    }
  };

  return (
    <div
      className={`${manrope.variable} min-h-screen w-full font-[family-name:var(--font-manrope)] bg-[#F7F8FA] flex flex-col items-center justify-center px-4 py-10`}
    >
      <div className="w-full max-w-[380px]">
        {/* Brand */}
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-[#0F172A]">
            <span className="text-sm font-bold tracking-tight text-white">US</span>
          </div>
          <h1 className="mt-3 text-lg font-bold tracking-tight text-[#0F172A]">
            Unix Solutions
          </h1>
          <p className="mt-0.5 text-xs text-[#8A93A3]">ERP Suite · UAE</p>
        </div>

        {/* Card */}
        <div className="rounded-xl border border-[#E7E9EE] bg-white px-6 py-7 shadow-sm sm:px-8">
          <h2 className="text-xl font-bold tracking-tight text-[#0F172A]">
            Sign in
          </h2>
          <p className="mt-1 text-sm text-[#6B7280]">
            Enter your details to access your account.
          </p>

          <form onSubmit={handleSubmit(onSubmit)} noValidate className="mt-6 space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-sm font-medium text-[#1C2333]">
                Email address
              </label>
              <div className="relative">
                <Mail
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA1AE]"
                />
                <input
                  id="email"
                  type="email"
                  placeholder="you@company.ae"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="w-full rounded-lg border border-[#D8DBE0] bg-white py-2.5 pl-10 pr-3.5 text-sm text-[#1C2333] placeholder:text-[#AEB4BF] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                  {...register("email", {
                    required: "Enter your email address.",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address.",
                    },
                  })}
                />
              </div>
              {errors.email && (
                <p id="email-error" className="text-xs text-[#C0362C]">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-sm font-medium text-[#1C2333]">
                  Password
                </label>
                <a href="/forgot-password" className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8]">
                  Forgot password?
                </a>
              </div>
              <div className="relative">
                <Lock
                  size={17}
                  className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9AA1AE]"
                />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="w-full rounded-lg border border-[#D8DBE0] bg-white py-2.5 pl-10 pr-10 text-sm text-[#1C2333] placeholder:text-[#AEB4BF] outline-none transition-colors focus:border-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/15"
                  {...register("password", { required: "Enter your password." })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#9AA1AE] hover:text-[#6B7280]"
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              {errors.password && (
                <p id="password-error" className="text-xs text-[#C0362C]">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Remember me */}
            <label className="flex items-center gap-2 pt-0.5 text-sm text-[#4B5163] cursor-pointer select-none">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[#D8DBE0] text-[#2563EB] focus:ring-2 focus:ring-[#2563EB]/20"
                {...register("remember")}
              />
              Keep me signed in
            </label>

            {/* Server error */}
            {serverError && (
              <div
                role="alert"
                className="rounded-lg border border-[#F4C7C2] bg-[#FDF1F0] px-4 py-2.5 text-sm text-[#B0342B]"
              >
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#0F172A] py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1E293B] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in…
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-[#9AA1AE]">
          UAE Federal Tax Authority compliant · VAT &amp; Corporate Tax
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}