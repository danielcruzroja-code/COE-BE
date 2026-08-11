import 'dotenv/config'
import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import cors from 'cors'
import helmet from 'helmet'
import conectarDB from './src/config/db.js'
import authRoutes from './src/routes/auth.routes.js'
import catalogosRoutes from './src/routes/catalogos.routes.js'
import emergenciasRoutes from './src/routes/emergencias.routes.js'
import unidadesRoutes from './src/routes/unidades.routes.js'
import usuariosRoutes from './src/routes/usuarios.routes.js'
import Unidad from './src/models/Unidad.js'

// ── Conectar base de datos ────────────────────────────────────────────────────
await conectarDB()

// ── App Express ───────────────────────────────────────────────────────────────
const app = express()
const httpServer = createServer(app)

// ── Orígenes permitidos (CORS) ────────────────────────────────────────────────
// Soporta múltiples orígenes separados por coma en CLIENT_URL
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map(o => o.trim())

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origin (ej. mobile apps, Postman, curl)
    if (!origin) return callback(null, true)
    if (allowedOrigins.includes(origin)) return callback(null, true)
    // En producción, ser permisivo con subdominios de railway.app
    if (process.env.NODE_ENV === 'production' && origin.endsWith('.railway.app')) {
      return callback(null, true)
    }
    callback(new Error(`CORS bloqueado para: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}

// ── Socket.io ─────────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// Exportar io para usarlo en controllers (despacho, GPS)
export { io }

// ── Middleware global ─────────────────────────────────────────────────────────
app.use(helmet({ crossOriginResourcePolicy: false }))
app.use(cors(corsOptions))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Inyectar io en req para que los controllers puedan emitir eventos
app.use((req, res, next) => {
  req.io = io
  next()
})

// ── Rutas API ─────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)
app.use('/api/catalogos', catalogosRoutes)
app.use('/api/emergencias', emergenciasRoutes)
app.use('/api/unidades', unidadesRoutes)
app.use('/api/usuarios', usuariosRoutes)

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404
app.use((req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' })
})

// ── Socket.io — eventos GPS ───────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`🔌 Socket conectado: ${socket.id}`)

  // Unidad en campo emite su ubicación
  socket.on('ubicacion:update', async (data) => {
    // data: { unidadId, lat, lng }
    // Broadcast a todos los operadores en la sala 'operadores'
    socket.to('operadores').emit('ubicacion:update', data)

    // Guardar ultimaUbicacion en Unidad
    try {
      if (data.unidadId && data.lat && data.lng) {
        await Unidad.findByIdAndUpdate(data.unidadId, {
          $set: {
            'ultimaUbicacion.lat': Number(data.lat),
            'ultimaUbicacion.lng': Number(data.lng),
            'ultimaUbicacion.actualizadoEn': new Date(),
          }
        })
      }
    } catch (err) {
      console.error('Error al guardar ubicación de la unidad en la BD:', err.message)
    }
  })

  // Operador se une a sala de operadores
  socket.on('sala:operador', () => {
    socket.join('operadores')
  })

  socket.on('disconnect', () => {
    console.log(`🔌 Socket desconectado: ${socket.id}`)
  })
})

// ── Iniciar servidor ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000
httpServer.listen(PORT, () => {
  console.log(`🚀 Servidor COE corriendo en http://localhost:${PORT}`)
  console.log(`📡 Socket.io listo`)
  console.log(`🌐 Entorno: ${process.env.NODE_ENV || 'development'}`)
})
