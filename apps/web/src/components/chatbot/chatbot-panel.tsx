'use client';

import { useState, useRef, useEffect, type KeyboardEvent } from 'react';
import { X, Send, Loader2, Bot, User, Zap } from 'lucide-react';
import apiClient from '@/lib/api-client';

interface Mensaje {
  id: string;
  tipo: 'usuario' | 'asistente' | 'error';
  texto: string;
  datos?: unknown[];
  cargando?: boolean;
}

const SUGERENCIAS = [
  '¿Cuál proveedor tiene el menor precio?',
  '¿Cuál proveedor entrega más rápido?',
  '¿Cuál proveedor ha vendido más a la empresa?',
  'Muéstrame los tres proveedores más confiables',
];

export function ChatbotPanel({ onClose }: { onClose: () => void }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([
    {
      id: 'bienvenida',
      tipo: 'asistente',
      texto: '¡Hola! Soy el Asistente de Compras SIGEC. Puedo ayudarte a consultar información sobre proveedores: precios, tiempos de entrega, historial de compras y confiabilidad. ¿En qué puedo ayudarte?',
    },
  ]);
  const [pregunta, setPregunta] = useState('');
  const [cargando, setCargando] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensajes]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const enviar = async (texto: string) => {
    const q = texto.trim();
    if (!q || cargando) return;

    const idUsuario = crypto.randomUUID();
    const idAsistente = crypto.randomUUID();

    setMensajes((prev) => [
      ...prev,
      { id: idUsuario, tipo: 'usuario', texto: q },
      { id: idAsistente, tipo: 'asistente', texto: '', cargando: true },
    ]);
    setPregunta('');
    setCargando(true);

    try {
      const { data } = await apiClient.post('/asistente/consulta', { pregunta: q });
      setMensajes((prev) =>
        prev.map((m) =>
          m.id === idAsistente
            ? { ...m, texto: data.respuesta, datos: data.datos, cargando: false }
            : m,
        ),
      );
    } catch {
      setMensajes((prev) =>
        prev.map((m) =>
          m.id === idAsistente
            ? { ...m, tipo: 'error', texto: 'No pude procesar tu consulta. Intenta nuevamente.', cargando: false }
            : m,
        ),
      );
    } finally {
      setCargando(false);
    }
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(pregunta); }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex h-[600px] w-[420px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10">
      {/* Header */}
      <div className="flex items-center justify-between bg-gradient-to-r from-teal-500 to-teal-600 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20">
            <Bot className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Asistente SIGEC</p>
            <p className="text-xs text-teal-100">Consultas de proveedores</p>
          </div>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-white/80 hover:bg-white/20 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {mensajes.map((m) => (
          <div key={m.id} className={`flex ${m.tipo === 'usuario' ? 'justify-end' : 'justify-start'}`}>
            {m.tipo !== 'usuario' && (
              <div className="mr-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-100">
                <Bot className="h-3.5 w-3.5 text-teal-600" />
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
              m.tipo === 'usuario'
                ? 'rounded-br-sm bg-teal-500 text-white'
                : m.tipo === 'error'
                ? 'rounded-bl-sm bg-red-50 text-red-700 ring-1 ring-red-200'
                : 'rounded-bl-sm bg-gray-100 text-gray-800'
            }`}>
              {m.cargando ? (
                <div className="flex items-center gap-2 text-gray-500">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span className="text-xs">Consultando...</span>
                </div>
              ) : (
                <>
                  <p className="whitespace-pre-line leading-relaxed">
                    {m.texto.replace(/\*\*(.*?)\*\*/g, '$1')}
                  </p>
                  {m.datos && Array.isArray(m.datos) && m.datos.length > 0 && (
                    <div className="mt-2 overflow-hidden rounded-lg border border-gray-200 bg-white text-xs">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            {Object.keys((m.datos[0] as object)).map((k) => (
                              <th key={k} className="px-2 py-1.5 text-left font-medium text-gray-600">
                                {k === 'posicion' ? '#' : k === 'proveedor' ? 'Proveedor' : k === 'codigo' ? 'Código' : k}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {(m.datos as Record<string, unknown>[]).map((fila, i) => (
                            <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              {Object.values(fila).map((v, j) => (
                                <td key={j} className="px-2 py-1.5 text-gray-700">
                                  {typeof v === 'number' ? v.toLocaleString('es-CO') : String(v)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
            {m.tipo === 'usuario' && (
              <div className="ml-2 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-teal-500">
                <User className="h-3.5 w-3.5 text-white" />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {mensajes.length <= 1 && (
        <div className="border-t px-4 py-2">
          <p className="mb-2 text-xs font-medium text-gray-500">Consultas frecuentes:</p>
          <div className="flex flex-wrap gap-1.5">
            {SUGERENCIAS.map((s) => (
              <button
                key={s}
                onClick={() => enviar(s)}
                className="flex items-center gap-1 rounded-full border border-teal-200 bg-teal-50 px-2.5 py-1 text-xs text-teal-700 hover:bg-teal-100"
              >
                <Zap className="h-2.5 w-2.5" />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t bg-gray-50 px-4 py-3">
        <div className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-3 py-2 focus-within:border-teal-400 focus-within:ring-1 focus-within:ring-teal-200">
          <input
            ref={inputRef}
            type="text"
            placeholder="Escribe tu consulta..."
            value={pregunta}
            onChange={(e) => setPregunta(e.target.value)}
            onKeyDown={handleKey}
            disabled={cargando}
            className="flex-1 bg-transparent text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none disabled:opacity-50"
          />
          <button
            onClick={() => enviar(pregunta)}
            disabled={!pregunta.trim() || cargando}
            className="rounded-lg bg-teal-500 p-1.5 text-white hover:bg-teal-600 disabled:opacity-40"
          >
            {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
