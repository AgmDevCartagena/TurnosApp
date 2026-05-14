/**
 * Diagnose script — compara estado local vs servidor
 * Uso: node scripts/diagnose.mjs
 */
import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import net from 'net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const apiRoot = resolve(__dirname, '..');

// ── helpers ───────────────────────────────────────────────────────────────────
function loadEnv() {
  const envPaths = [
    resolve(apiRoot, '.env'),
    resolve(apiRoot, '..', '..', '.env'),
  ];
  const env = {};
  for (const p of envPaths) {
    if (existsSync(p)) {
      readFileSync(p, 'utf8').split('\n').forEach((line) => {
        const [k, ...v] = line.split('=');
        if (k && !k.startsWith('#')) env[k.trim()] = v.join('=').trim();
      });
      break;
    }
  }
  return env;
}

function run(cmd) {
  try {
    return execSync(cmd, { cwd: apiRoot, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();
  } catch (e) {
    return `ERROR: ${e.stderr || e.message}`;
  }
}

function checkTcpPort(host, port, timeout = 2000) {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    const t = setTimeout(() => { socket.destroy(); resolve(false); }, timeout);
    socket.connect(port, host, () => { clearTimeout(t); socket.destroy(); resolve(true); });
    socket.on('error', () => { clearTimeout(t); resolve(false); });
  });
}

// ── main ──────────────────────────────────────────────────────────────────────
const env = loadEnv();
const dbUrl = env.DATABASE_URL || process.env.DATABASE_URL || '(no configurado)';
const redisHost = env.REDIS_HOST || 'localhost';
const redisPort = parseInt(env.REDIS_PORT || '6379', 10);
const apiPort = env.API_PORT || '3001';
const apiPrefix = env.API_PREFIX || 'api/v1';
const baseUrl = `http://localhost:${apiPort}/${apiPrefix}`;

console.log('\n═══════════════════════════════════════════════════');
console.log('  DIAGNÓSTICO — Gestion_Compras API');
console.log('═══════════════════════════════════════════════════\n');

console.log('📁 Variables de entorno relevantes:');
console.log(`   DATABASE_URL : ${dbUrl.replace(/:\/\/[^:]+:[^@]+@/, '://***:***@')}`);
console.log(`   REDIS_HOST   : ${redisHost}`);
console.log(`   REDIS_PORT   : ${redisPort}`);
console.log(`   API_PORT     : ${apiPort}`);
console.log(`   NODE_ENV     : ${env.NODE_ENV || process.env.NODE_ENV || '(no definido)'}`);

console.log('\n📦 Prisma:');
console.log('   migrate status:');
const migrateStatus = run('npx prisma migrate status --schema=src/database/prisma/schema.prisma');
migrateStatus.split('\n').forEach((l) => console.log(`     ${l}`));

console.log('\n🌐 Conectividad:');
const dbOk = await checkTcpPort('127.0.0.1', 5433);
console.log(`   PostgreSQL (127.0.0.1:5433) : ${dbOk ? '✅ accesible' : '❌ no accesible'}`);
const redisOk = await checkTcpPort(redisHost, redisPort);
console.log(`   Redis (${redisHost}:${redisPort})  : ${redisOk ? '✅ accesible' : '❌ no accesible'}`);

console.log('\n🔗 Endpoints (la API debe estar corriendo):');
for (const path of ['health', 'ubicaciones/paises', 'ubicaciones/departamentos']) {
  const result = run(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${apiPort}/${apiPrefix}/${path}`);
  const icon = result === '200' ? '✅' : result === '401' ? '🔐' : '❌';
  console.log(`   GET /${apiPrefix}/${path} → HTTP ${result} ${icon}`);
}

console.log('\n═══════════════════════════════════════════════════\n');
