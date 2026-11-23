
import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Field, { inputClass } from '../components/ui/Field';
import { homeFor, useAuth } from '../context/AuthContext';
import { loginSchema, type LoginForm } from '../utils/validation';
import { apiErrorMessage, statusOf } from '../services/api';

/** Only follow same-site redirects such as /projects/x, never external URLs. */
export const safeNext = (next: string | null) =>
  next && next.startsWith('/') && !next.startsWith('//') ? next : null;

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
      <rect x="3" y="5" width="18" height="14" rx="1.5" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = safeNext(params.get('next'));
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  if (user) {
    return <Navigate to={next ?? homeFor(user.role)} replace />;
  }

  const onSubmit = async (v: LoginForm) => {
    setError(null);

    try {
      const u = await login(v.email, v.password);
      navigate(next ?? homeFor(u.role), { replace: true });
    } catch (e) {
      setError(
        statusOf(e) === 401
          ? 'Incorrect email or password.'
          : apiErrorMessage(e)
      );
    }
  };

  // Same input styling as SignupPage
  const fieldClass = `${inputClass} !w-full !h-[52px] !rounded-[5px] !border !border-transparent !bg-[#f5f3f0] !px-4 !pr-12 !text-[14px] !text-[#30343a] placeholder:!text-[#b9bdc3] focus:!border-[#b6a38b] focus:!bg-white focus:!outline-none focus:!ring-2 focus:!ring-[#c9b69b]/20 transition-all`;

  return (
    <main className="min-h-screen bg-[#faf8f5] flex items-center justify-center px-4 py-8 sm:px-8 lg:px-12">

      <section className="w-full max-w-[1240px] overflow-hidden rounded-[24px] bg-white shadow-[0_20px_55px_rgba(40,35,29,0.13)] grid grid-cols-1 lg:grid-cols-2 min-h-[780px]">

        {/* LEFT: LOGIN FORM */}

        <div className="flex flex-col justify-center px-6 py-10 sm:px-10 md:px-14 lg:px-12 xl:px-[70px]">

          {/* BRAND */}

          <Link to="/" className="flex items-center gap-4 w-fit mb-12">
            <div className="flex h-[43px] w-[43px] items-center justify-center rounded-[12px] bg-[#1e2225] text-white font-serif text-[25px]">
              A
            </div>

            <div className="flex flex-col gap-[2px]">
              <span className="text-[12px] font-medium uppercase tracking-[0.13em] text-[#25282a]">
                AUSPak Interior
              </span>
              <span className="text-[10px] uppercase tracking-[0.07em] text-[#596575]">
                Architectural Atelier
              </span>
            </div>
          </Link>

          {/* HEADING */}

          <div className="mb-8">
            <h1 className="font-serif text-[30px] leading-tight tracking-[-0.04em] text-[#1e2225] sm:text-[32px]">
              Welcome back
            </h1>

            <p className="mt-3 max-w-[420px] text-[15px] leading-[1.7] text-[#596575]">
              Log in to access your favourite designs and track your bespoke interior projects.
            </p>

            {params.get('reason') === 'favourite' && (
              <p className="mt-3 rounded-md border border-[#e9dfd0] bg-[#faf7f1] px-4 py-3 text-[13px] text-[#9a7046]">
                Please log in to save favourite designs.
              </p>
            )}
          </div>

          {/* FORM */}

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-[19px]"
            aria-label="Login form"
          >

            {/* EMAIL */}

            <Field
              id="email"
              label="Email address"
              error={errors.email?.message}
            >
              <div className="relative">
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="e.g. ali@gmail.com"
                  className={fieldClass}
                  {...register('email')}
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a3a8ac] pointer-events-none">
                  <MailIcon />
                </span>
              </div>
            </Field>

            {/* PASSWORD */}

            <Field
              id="password"
              label="Password"
              error={errors.password?.message}
            >
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  className={fieldClass}
                  {...register('password')}
                />

                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[#a3a8ac] pointer-events-none">
                  <LockIcon />
                </span>
              </div>
            </Field>

            {/* API ERROR */}

            {error && (
              <p
                role="alert"
                data-testid="login-error"
                className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {error}
              </p>
            )}

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={isSubmitting}
              className="group flex w-full items-center justify-center gap-3 rounded-[5px] bg-[#1e2225] px-6 py-[16px] text-[12px] font-medium uppercase tracking-[0.12em] text-white shadow-sm transition-all duration-300 hover:bg-[#343a3e] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Logging in...' : 'Log in'}

              {!isSubmitting && (
                <svg
                  className="transition-transform duration-300 group-hover:translate-x-1"
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M5 12h14M13 6l6 6-6 6" />
                </svg>
              )}
            </button>
          </form>

          {/* SIGNUP LINK */}

          <div className="mt-9 border-t border-[#eeeae5] pt-7 text-center">
            <p className="text-[13px] text-[#69717b]">
              New here?{' '}
              <Link
                className="font-medium text-[#24282b] underline underline-offset-4 transition-colors hover:text-[#c86b4a]"
                to={`/signup${next ? `?next=${encodeURIComponent(next)}` : ''}`}
              >
                Create a customer account
              </Link>
            </p>
          </div>

        </div>

        {/* RIGHT: ARCHITECTURAL IMAGE PANEL */}

        <div className="relative hidden min-h-full overflow-hidden bg-[#5e5549] lg:block">

          <img
            src="/images/interior-login.png"
            alt="AUSPak Interior architectural kitchen design"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />

          <div className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/10 to-black/75" />

          {/* PROJECT LABEL */}

          <div className="absolute right-7 top-7 flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-4 py-2 backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-[#f0cf91]" />
            <span className="text-[10px] font-medium uppercase tracking-[0.08em] text-white">
              Project Atelier • 2026
            </span>
          </div>

          {/* BRAND STATEMENT */}

          <div className="absolute bottom-8 left-8 right-8 rounded-[17px] border border-white/20 bg-[#17191a]/90 p-6 shadow-2xl backdrop-blur-md xl:bottom-10 xl:left-10 xl:right-10 xl:p-8">

            <div className="mb-5 flex items-center justify-between">
              <span className="font-serif text-[30px] leading-none text-[#e7c997]">
                “
              </span>

              <div className="flex items-center gap-1.5">
                <span className="h-[5px] w-6 rounded-full bg-[#e7c997]" />
                <span className="h-[5px] w-[5px] rounded-full bg-white/40" />
                <span className="h-[5px] w-[5px] rounded-full bg-white/40" />
              </div>
            </div>

            <p className="font-serif text-[20px] italic leading-[1.55] text-white xl:text-[22px]">
              Thoughtfully designed spaces, crafted around the way you live.
            </p>

            <div className="my-5 h-px bg-white/15" />

            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white">
                  AUSPak Interior
                </p>
                <p className="mt-1 text-[12px] text-[#d6bd98]">
                  Bespoke interiors. Timeless architecture.
                </p>
              </div>

              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[#d6bd98]/50 text-[#d6bd98]">
                <svg
                  width="17"
                  height="17"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.4"
                >
                  <path d="M12 2.5 14.5 5l3.5-.2.2 3.5 2.5 2.5-2.5 2.5.2 3.5-3.5-.2-2.5 2.5-2.5-2.5-3.5.2.2-3.5-2.5-2.5L6.2 8.3 6 4.8l3.5.2L12 2.5Z" />
                  <circle cx="12" cy="11.3" r="3" />
                </svg>
              </div>
            </div>
          </div>

        </div>

      </section>
    </main>
  );
}
