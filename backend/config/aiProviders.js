'use strict';

/**
 * aiProviders.js
 * Catálogo de proveedores IA soportados. Fuente de verdad para frontend y backend.
 * Para agregar un proveedor: añadir entrada aquí y extender proveedorIA.js si requiere
 * adaptador de llamada específico.
 */

const PROVIDERS = [
  // ── API Directa ───────────────────────────────────────────────────────────
  {
    codigo: 'openai', nombre: 'OpenAI', tipo: 'direct_api',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 1,
    modelosSugeridos: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1-mini', 'gpt-4.1', 'o3-mini', 'o4-mini'],
  },
  {
    codigo: 'anthropic', nombre: 'Anthropic Claude', tipo: 'direct_api',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 2,
    modelosSugeridos: ['claude-haiku-4-5', 'claude-sonnet-4-5', 'claude-sonnet-4-6', 'claude-opus-4-5'],
  },
  {
    codigo: 'google_gemini', nombre: 'Google Gemini', tipo: 'direct_api',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 3,
    modelosSugeridos: ['gemini-2.5-flash-lite', 'gemini-2.5-flash', 'gemini-2.5-pro'],
  },
  {
    codigo: 'mistral', nombre: 'Mistral AI', tipo: 'direct_api',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 4,
    modelosSugeridos: ['mistral-small-latest', 'mistral-medium-latest', 'codestral-latest'],
  },
  {
    codigo: 'cohere', nombre: 'Cohere', tipo: 'direct_api',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 5,
    modelosSugeridos: ['command-r', 'command-r-plus', 'command-a-03-2025'],
  },
  {
    codigo: 'groq', nombre: 'Groq', tipo: 'direct_api',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 6,
    modelosSugeridos: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'qwen/qwen3-32b', 'openai/gpt-oss-120b'],
  },
  {
    codigo: 'deepseek', nombre: 'DeepSeek', tipo: 'direct_api',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 7,
    modelosSugeridos: ['deepseek-chat', 'deepseek-reasoner'],
  },
  {
    codigo: 'xai', nombre: 'xAI (Grok)', tipo: 'direct_api',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 8,
    modelosSugeridos: ['grok-3-mini', 'grok-3', 'grok-2-1212'],
  },
  {
    codigo: 'perplexity', nombre: 'Perplexity AI', tipo: 'direct_api',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 9,
    modelosSugeridos: ['sonar-pro', 'sonar', 'sonar-reasoning-pro'],
  },
  // ── Plataformas Cloud ─────────────────────────────────────────────────────
  {
    codigo: 'azure_openai', nombre: 'Azure OpenAI / AI Foundry', tipo: 'cloud_platform',
    requiereApiKey: true, requiereBaseUrl: true, activo: true, orden: 10,
    modelosSugeridos: ['gpt-4o-mini', 'gpt-4o', 'model-router'],
  },
  {
    codigo: 'nvidia_nim', nombre: 'NVIDIA NIM', tipo: 'cloud_platform',
    requiereApiKey: true, requiereBaseUrl: false, compatibleOpenAI: true,
    baseUrlDefault: 'https://integrate.api.nvidia.com/v1', activo: true, orden: 11,
    notaModelos: 'Los modelos disponibles pueden cambiar según el catálogo y la cuenta NVIDIA configurada. Algunos tienen endpoint gratuito para desarrollo.',
    modelosSugeridos: [
      'nvidia/nemotron-3.5-lightning-30b-a3b',
      'nvidia/nemotron-3-ultra-550b-a55b',
      'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning',
      'deepseek-ai/deepseek-v4-flash-0731',
      'meta/llama-3.3-70b-instruct',
      'mistralai/mistral-large-2-instruct',
      'google/gemma-3-27b-it',
      'zai-org/glm-5.2',
      'minimaxai/minimax-m3',
      'nvidia/nemotron-3.5-content-safety',
      'nvidia/nemotron-3-embed-1b',
      'nvidia/nemotron-ocr-v2',
    ],
  },
  {
    codigo: 'aws_bedrock', nombre: 'AWS Bedrock', tipo: 'cloud_platform',
    requiereApiKey: false, requiereBaseUrl: false, requiereRegion: true, activo: true, orden: 12,
    modelosSugeridos: ['anthropic.claude-3-haiku', 'amazon.nova-lite-v1:0', 'meta.llama3-70b-instruct-v1:0'],
  },
  {
    codigo: 'google_vertex', nombre: 'Google Vertex AI', tipo: 'cloud_platform',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 13,
    modelosSugeridos: ['gemini-2.5-flash', 'gemini-2.5-pro'],
  },
  // ── Agregadores ───────────────────────────────────────────────────────────
  {
    codigo: 'openrouter', nombre: 'OpenRouter', tipo: 'aggregator',
    requiereApiKey: true, requiereBaseUrl: true, activo: true, orden: 14,
    modelosSugeridos: ['openai/gpt-4o-mini', 'anthropic/claude-sonnet', 'google/gemini-flash-1.5', 'meta-llama/llama-3.3-70b-instruct'],
  },
  {
    codigo: 'together', nombre: 'Together AI', tipo: 'aggregator',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 15,
    modelosSugeridos: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'mistralai/Mixtral-8x7B-Instruct-v0.1'],
  },
  {
    codigo: 'fireworks', nombre: 'Fireworks AI', tipo: 'aggregator',
    requiereApiKey: true, requiereBaseUrl: false, activo: true, orden: 16,
    modelosSugeridos: ['accounts/fireworks/models/llama-v3p3-70b-instruct', 'accounts/fireworks/models/qwen3-30b-a3b'],
  },
  {
    codigo: 'huggingface', nombre: 'Hugging Face Inference', tipo: 'aggregator',
    requiereApiKey: true, requiereBaseUrl: true, activo: true, orden: 17,
    modelosSugeridos: ['mistralai/Mistral-7B-Instruct-v0.3', 'Qwen/Qwen2.5-72B-Instruct'],
  },
  // ── Ejecución local ───────────────────────────────────────────────────────
  {
    codigo: 'ollama', nombre: 'Ollama / Local', tipo: 'local_runtime',
    requiereApiKey: false, requiereBaseUrl: true, activo: true, orden: 18,
    modelosSugeridos: ['llama3.1', 'mistral', 'qwen2.5', 'codellama', 'phi3', 'deepseek-r1'],
  },
  {
    codigo: 'lmstudio', nombre: 'LM Studio / Local', tipo: 'local_runtime',
    requiereApiKey: false, requiereBaseUrl: true, activo: true, orden: 19,
    modelosSugeridos: ['local-model'],
  },
];

const TIPO_LABELS = {
  direct_api:     'API Directa',
  cloud_platform: 'Plataformas Cloud',
  aggregator:     'Agregadores',
  local_runtime:  'Ejecución Local',
};

function listarActivos() {
  return PROVIDERS.filter(p => p.activo).sort((a, b) => a.orden - b.orden);
}

function buscarPorCodigo(codigo) {
  return PROVIDERS.find(p => p.codigo === codigo) || null;
}

function codigosValidos() {
  return PROVIDERS.filter(p => p.activo).map(p => p.codigo);
}

module.exports = { listarActivos, buscarPorCodigo, codigosValidos, TIPO_LABELS };
