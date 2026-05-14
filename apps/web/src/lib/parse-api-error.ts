export interface ApiErrorDetail {
  field: string;
  label: string;
  messages: string[];
}

export interface ParsedApiError {
  summary: string;
  details: ApiErrorDetail[];
  allMessages: string[];
}

const HTTP_MESSAGES: Record<number, string> = {
  400: 'La información enviada no es válida. Revise los campos marcados.',
  401: 'Su sesión ha expirado. Inicie sesión nuevamente.',
  403: 'No tiene permisos para realizar esta acción.',
  404: 'No se encontró el registro solicitado.',
  409: 'Ya existe un registro con esta información.',
  500: 'Ocurrió un error interno. Intente nuevamente o contacte al administrador.',
};

/**
 * Centralized API error parser. Handles:
 * - Structured { error: { message, details[] } } responses from our backend
 * - Legacy { message: string | string[] } responses
 * - Axios network errors
 */
export function parseApiError(err: unknown, fallback = 'Ocurrió un error. Intente nuevamente.'): ParsedApiError {
  const axiosError = err as {
    response?: {
      status?: number;
      data?: {
        error?: { message?: string; details?: ApiErrorDetail[] };
        message?: string | string[];
        errors?: ApiErrorDetail[];
      };
    };
    message?: string;
  };

  const status = axiosError?.response?.status ?? 0;
  const data = axiosError?.response?.data;

  if (!data) {
    const msg = axiosError?.message?.includes('Network Error')
      ? 'No se pudo conectar con el servidor. Verifique su conexión.'
      : (axiosError?.message ?? fallback);
    return { summary: msg, details: [], allMessages: [msg] };
  }

  // ── Structured response { error: { message, details } } ───────────────────
  if (data.error) {
    const summary = data.error.message ?? HTTP_MESSAGES[status] ?? fallback;
    const details: ApiErrorDetail[] = data.error.details ?? [];
    const allMessages = details.length
      ? details.flatMap((d) => d.messages).filter(Boolean)
      : [summary];
    return { summary, details, allMessages };
  }

  // ── Legacy array message ───────────────────────────────────────────────────
  if (Array.isArray(data.message)) {
    const msgs = (data.message as string[]).filter(Boolean);
    const summary = HTTP_MESSAGES[status] ?? fallback;
    const details: ApiErrorDetail[] = msgs.map((m) => ({ field: '', label: '', messages: [m] }));
    return { summary, details, allMessages: msgs };
  }

  // ── Legacy string message ──────────────────────────────────────────────────
  if (typeof data.message === 'string') {
    const msg = data.message || HTTP_MESSAGES[status] || fallback;
    return { summary: msg, details: [], allMessages: [msg] };
  }

  const msg = HTTP_MESSAGES[status] ?? fallback;
  return { summary: msg, details: [], allMessages: [msg] };
}
