import mongoose from 'mongoose'
import dns from 'dns'

// Asegurar resolución DNS correcta para MongoDB Atlas en Node.js / Windows
try {
  dns.setServers(['8.8.8.8', '1.1.1.1'])
} catch (e) {
  // Fallback si no se permite cambiar servidores DNS
}

const conectarDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI)
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`)
  } catch (error) {
    console.error(`❌ Error conectando a MongoDB: ${error.message}`)
    process.exit(1)
  }
}

export default conectarDB
