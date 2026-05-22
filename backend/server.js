const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const session = require('express-session');
require('dotenv').config();

// Importar rutas principales
const turnosRoutes = require('./routes/turnos');
const nominaRoutes = require('./routes/nominaRoutes');
const authRoutes = require('./routes/auth');
const empresasRoutes = require('./routes/empresas');
const dashboardRoutes = require('./routes/dashboard');
const { requireAuth, requireModulo } = require('./middlewares/auth');
const { requireTenant } = require('./middlewares/tenant');

const app = express();

// CORS: orígenes permitidos configurables por variable de entorno
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3001', 'http://localhost:5173', 'http://localhost:5174'];

app.use(cors({
  origin: (origin, callback) => {
    // Sin origen: peticiones del mismo servidor, curl, Postman
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // En desarrollo permitir cualquier localhost
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/localhost(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    console.warn(`[CORS] Origen bloqueado: ${origin}`);
    callback(null, false);
  },
  credentials: true
}));
app.use(express.json());

// Configuración de sesiones para módulo de nómina
app.use(session({
  secret: process.env.SESSION_SECRET || 'sistema_gestion_secret',
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000 // 1 día
  }
}));

// Manejar errores no capturados
process.on('uncaughtException', (error) => {
  console.error('❌ Excepción no capturada:', error.message);
  console.error(error.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promesa rechazada no manejada:', reason);
  console.error('En promesa:', promise);
  process.exit(1);
});

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/turnos_app';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoIndex: true
}).then(() => console.log('✅ MongoDB conectado'))
  .catch(err => {
    console.error('❌ Error MongoDB:', err);
    if (process.env.NODE_ENV !== 'test') process.exit(1);
  });

// API Routes - Sistema modular
app.use('/api/auth', authRoutes);
app.use('/api/empresas', empresasRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/turnos', requireAuth, requireTenant, requireModulo('turnos'), turnosRoutes);
app.use('/api/nomina', requireAuth, requireTenant, requireModulo('nomina'), nominaRoutes);

// Serve frontend static files
// En Docker, los archivos están en /app/public
// En desarrollo, están en ../frontend
const isDocker = process.env.NODE_ENV === 'production' && process.env.MONGO_URI && process.env.MONGO_URI.includes('mongodb://mongodb');
const frontendPath = isDocker ? path.join(__dirname, 'public') : path.join(__dirname, '..', 'frontend');
const nominaBuildPath = isDocker ? path.join(__dirname, 'public', 'nomina-build') : path.join(__dirname, '..', 'frontend', 'nomina-build');
const turnosBuildPath = isDocker ? path.join(__dirname, 'public', 'turnos-build') : path.join(__dirname, '..', 'frontend', 'turnos-build');

// ========== RUTAS PROTEGIDAS (ANTES de express.static) ==========

// Proteger acceso a usuarios.html
app.get('/usuarios.html', (req, res) => {
  console.log('🔐 Acceso a usuarios.html - Autenticado:', !!req.session?.autenticado);
  if (!req.session || !req.session.autenticado) {
    return res.redirect('/login.html');
  }
  const rolesAdminHtml = ['admin', 'super_admin'];
  if (!rolesAdminHtml.includes(req.session.usuario.rol)) {
    return res.status(403).send('Acceso denegado. Solo administradores pueden acceder.');
  }
  res.sendFile(path.join(frontendPath, 'usuarios.html'));
});

// Proteger acceso a empresas.html (solo super_admin)
app.get('/empresas.html', (req, res) => {
  if (!req.session || !req.session.autenticado) {
    return res.redirect('/login.html');
  }
  if (req.session.usuario.rol !== 'super_admin') {
    return res.status(403).send('Acceso denegado. Solo el super administrador puede gestionar empresas.');
  }
  res.sendFile(path.join(frontendPath, 'empresas.html'));
});

// Proteger acceso a dashboard.html
app.get('/dashboard.html', (req, res) => {
  console.log('🔐 Acceso a dashboard.html - Autenticado:', !!req.session?.autenticado);
  if (!req.session || !req.session.autenticado) {
    return res.redirect('/login.html');
  }
  res.sendFile(path.join(frontendPath, 'dashboard.html'));
});

// Ruta principal - redirigir a login
app.get('/', (req, res) => {
  res.redirect('/login.html');
});

// IMPORTANTE: Las rutas de módulos deben verificar autenticación ANTES de servir archivos
// Middleware de autenticación para módulo de turnos
app.use('/turnos', (req, res, next) => {
  console.log('🔐 Acceso a /turnos - Autenticado:', !!req.session?.autenticado);
  if (req.session && req.session.autenticado) {
    return next();
  }
  if (req.path.includes('/assets/') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    return res.status(401).send('No autenticado');
  }
  return res.redirect('/login.html');
});

// Middleware de autenticación para módulo de nómina  
app.use('/nomina', (req, res, next) => {
  console.log('🔐 Acceso a /nomina - Autenticado:', !!req.session?.autenticado);
  if (req.session && req.session.autenticado) {
    return next();
  }
  if (req.path.includes('/assets/') || req.path.endsWith('.js') || req.path.endsWith('.css')) {
    return res.status(401).send('No autenticado');
  }
  return res.redirect('/login.html');
});

// Servir archivos estáticos de la app React de nómina
app.use('/nomina', express.static(nominaBuildPath));

// Servir archivos estáticos de la app React de turnos
app.use('/turnos', express.static(turnosBuildPath));

// ========== ARCHIVOS ESTÁTICOS PÚBLICOS ==========
// Servir archivos estáticos del frontend (DESPUÉS de las rutas protegidas)
// Solo sirve archivos que NO están protegidos (login.html, index.html, css, js públicos)
app.use(express.static(frontendPath, {
  index: false
}));

// Rutas catch-all para las apps React (después de static para servir index.html)
app.get('/turnos', (req, res) => {
  res.sendFile(path.join(turnosBuildPath, 'index.html'));
});
app.get('/turnos/*', (req, res) => {
  res.sendFile(path.join(turnosBuildPath, 'index.html'));
});
app.get('/nomina', (req, res) => {
  res.sendFile(path.join(nominaBuildPath, 'index.html'));
});
app.get('/nomina/*', (req, res) => {
  res.sendFile(path.join(nominaBuildPath, 'index.html'));
});

module.exports = app;

if (process.env.NODE_ENV !== 'test') {
  const PORT = process.env.PORT || 3001;
  const server = app.listen(PORT, () => {
    console.log('\n╔════════════════════════════════════════════════════╗');
    console.log('║   SISTEMA INTEGRADO DE GESTIÓN EMPRESARIAL        ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  🚀 Servidor: http://localhost:${PORT}                 ║`);
    console.log('║  📊 Módulos disponibles:                           ║');
    console.log(`║     • Turnos: http://localhost:${PORT}/turnos          ║`);
    console.log(`║     • Nómina: http://localhost:${PORT}/nomina          ║`);
    console.log('║  📡 API:                                           ║');
    console.log(`║     • /api/turnos - Gestión de turnos              ║`);
    console.log(`║     • /api/nomina - Gestión de nómina              ║`);
    console.log('║  📊 Base de datos: MongoDB conectada               ║');
    console.log('╚════════════════════════════════════════════════════╝\n');
  });

  server.on('error', (error) => {
    console.error('❌ Error del servidor:', error.message);
    if (error.code === 'EADDRINUSE') {
      console.error(`Puerto ${process.env.PORT || 3001} ya está en uso`);
    }
  });
}

process.on('SIGINT', () => {
  console.log('\n🛑 Cerrando servidor...');
  mongoose.disconnect().then(() => {
    console.log('✅ MongoDB desconectado');
    process.exit(0);
  });
});
