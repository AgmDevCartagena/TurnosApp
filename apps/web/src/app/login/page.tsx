'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { loginWithMicrosoft } from '@/lib/auth-microsoft';
import { useAuthStore } from '@/lib/auth-store';

const loginSchema = z.object({
  username: z.string()
    .min(1, 'El usuario es requerido')
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .regex(/^[a-zA-Z0-9_-]+$/, 'El usuario solo puede contener letras, números, guiones y guiones bajos'),
  password: z.string().min(6, 'La contraseña debe tener al menos 6 caracteres'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '' },
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsLoading(true);
    try {
      await login(data.username, data.password);
      router.push('/dashboard');
    } catch (err: any) {
      const message =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        'Error al iniciar sesión';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMicrosoftLogin = async () => {
    setError(null);
    setIsMicrosoftLoading(true);

    try {
      const result = await loginWithMicrosoft();
      
      useAuthStore.setState({
        user: result.usuario,
        isAuthenticated: true,
      });

      if (result.isNewUser) {
        router.push('/dashboard?welcome=true');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      console.error('Error en autenticación:', err);
      
      let errorMessage = 'No fue posible iniciar sesión. Intenta nuevamente.';
      
      if (err?.response?.status === 403) {
        errorMessage = err?.response?.data?.message || 
          'Tu cuenta no tiene acceso a esta plataforma. Contacta al administrador.';
      } else if (err?.response?.status === 401) {
        errorMessage = 'La autenticación con Microsoft falló. Verifica tus credenciales.';
      } else if (err?.message?.includes('popup')) {
        errorMessage = 'Se bloqueó la ventana emergente. Permite ventanas emergentes para este sitio.';
      }
      
      setError(errorMessage);
    } finally {
      setIsMicrosoftLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* ── Panel izquierdo (branding) ── */}
      <div className="relative hidden lg:flex lg:w-[52%] flex-col overflow-hidden"
           style={{ background: 'linear-gradient(160deg, #052e1c 0%, #0a4530 40%, #0d5c3a 75%, #0f6b44 100%)' }}>

        {/* Luz ambiental sutil superior */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 h-80 w-80 rounded-full opacity-[0.07]"
             style={{ background: 'radial-gradient(circle, #6ee7b7 0%, transparent 70%)' }} />
        {/* Luz ambiental inferior derecha */}
        <div className="pointer-events-none absolute bottom-10 -right-20 h-72 w-72 rounded-full opacity-[0.06]"
             style={{ background: 'radial-gradient(circle, #34d399 0%, transparent 70%)' }} />

        {/* Patrón de puntos muy discreto */}
        <div className="pointer-events-none absolute inset-0 opacity-[0.035]"
             style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />

        {/* Contenido — flujo vertical natural */}
        <div className="relative z-10 flex flex-1 flex-col px-10 py-10">

          {/* ① Bloque de marca */}
          <div className="flex flex-col items-center pb-8 border-b border-white/10">
            <img
              src="/logo-full.png"
              alt="SIGEC — Sistema de Gestión de Compras Empresarial"
              style={{
                width: '220px',
                height: 'auto',
                display: 'block',
                mixBlendMode: 'multiply',
                filter: 'brightness(1.6) contrast(1.05) saturate(1.2)',
              }}
            />
          </div>

          {/* ② Contenido principal */}
          <div className="mt-8 flex-1 flex flex-col justify-between">
            <div>
              {/* Badge */}
              <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-xs font-semibold text-emerald-300 ring-1 ring-emerald-400/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Sistema activo
              </div>

              {/* Heading */}
              <h2 className="text-[2.15rem] font-extrabold leading-tight tracking-tight text-white">
                Gestión de Compras<br />
                <span className="text-emerald-400">Empresarial</span>
              </h2>

              <p className="mt-3 text-sm leading-relaxed text-white/55 max-w-xs">
                Centraliza, controla y optimiza el proceso de compras de tu organización desde un solo lugar.
              </p>

              {/* Features */}
              <ul className="mt-6 space-y-2.5">
                {[
                  'Solicitudes de compra con flujo de aprobación',
                  'Cotizaciones y órdenes de compra',
                  'Gestión multiempresa y centros de costo',
                  'Asistente IA para análisis de proveedores',
                ].map((feat) => (
                  <li key={feat} className="flex items-center gap-3 text-sm text-white/65">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/25 ring-1 ring-emerald-500/35">
                      <svg className="h-2.5 w-2.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>

            {/* Footer */}
            <p className="mt-8 text-xs text-white/25 tracking-wide">© 2026 AGM — Todos los derechos reservados</p>
          </div>
        </div>
      </div>

      {/* ── Panel derecho (formulario) ── */}
      <div className="flex flex-1 flex-col items-center justify-center bg-gray-50 px-6 py-12 lg:px-16">
        {/* Logo móvil */}
        <div className="mb-8 flex flex-col items-center lg:hidden">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-black/5">
            <img src="/logo-full.png" alt="SIGEC" className="h-12 w-12 object-contain" />
          </div>
          <span className="mt-3 text-xl font-bold text-slate-900">SIGEC</span>
        </div>

        <div className="w-full max-w-sm">
          {/* Encabezado */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-slate-900">Bienvenido de nuevo</h1>
            <p className="mt-1.5 text-sm text-slate-500">Ingresa tus credenciales para continuar</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100">
                <AlertCircle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-800">Error de autenticación</p>
                <p className="mt-0.5 text-xs text-red-600">{error}</p>
              </div>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label htmlFor="username" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Usuario
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                <input
                  id="username"
                  type="text"
                  autoComplete="username"
                  placeholder="Ej: jperez"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/10"
                  {...register('username')}
                />
              </div>
              {errors.username && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />{errors.username.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Contraseña
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-11 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 transition focus:border-emerald-500 focus:outline-none focus:ring-3 focus:ring-emerald-500/10"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 rounded-md p-0.5 text-slate-400 transition hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
                  <AlertCircle className="h-3 w-3" />{errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="relative mt-2 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl py-3 text-sm font-semibold text-white shadow-md shadow-emerald-600/20 transition-all hover:shadow-lg hover:shadow-emerald-600/30 hover:-translate-y-0.5 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #0f5c43 0%, #159166 100%)' }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Ingresando...
                </>
              ) : (
                <>
                  Iniciar Sesión
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Divisor */}
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gray-50 px-3 text-xs font-medium text-slate-400">O ingresa con</span>
            </div>
          </div>

          {/* Microsoft */}
          <button
            onClick={handleMicrosoftLogin}
            disabled={isMicrosoftLoading}
            className="flex w-full items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isMicrosoftLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                </svg>
                Continuar con Microsoft 365
              </>
            )}
          </button>

          <p className="mt-8 text-center text-xs text-slate-400">
            © 2026 AGM · Gestión de Compras · Todos los derechos reservados
          </p>
        </div>
      </div>
    </div>
  );
}
