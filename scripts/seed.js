import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import conectarDB from '../src/config/db.js'
import Usuario from '../src/models/Usuario.js'
import Colonia from '../src/models/Colonia.js'
import Dependencia from '../src/models/Dependencia.js'
import CatalogoIncidente from '../src/models/CatalogoIncidente.js'
import Unidad from '../src/models/Unidad.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ── Leer archivos de datos ────────────────────────────────────────────────────
const leerJSON = (nombreArchivo) => {
  const ruta = path.join(__dirname, nombreArchivo)
  if (!fs.existsSync(ruta)) return null
  return JSON.parse(fs.readFileSync(ruta, 'utf-8'))
}

// Parsear CSV de colonias
const parsearCSVColonias = () => {
  const ruta = path.join(__dirname, '../../colonias-zapopan-bd.csv')
  if (!fs.existsSync(ruta)) return []
  const contenido = fs.readFileSync(ruta, 'utf-8')
  const lineas = contenido.trim().split('\n').slice(1) // quitar encabezado
  return lineas.map((linea) => {
    const partes = linea.split(',')
    return {
      codigoPostal: partes[0]?.trim(),
      nombre: partes[5]?.trim(),
      tipo: partes[4]?.trim(),
      claveOficina: partes[6]?.trim(),
    }
  }).filter((c) => c.nombre) // eliminar vacíos
}

// Transformar incidentes del JSON al schema de Mongoose
const transformarIncidente = (item) => ({
  codigo_cnie: item.codigo_cnie,
  nombre: item.incidente,
  categoria: item.categoria,
  subcategoria: item.subcategoria,
  prioridadSugerida: item.nivel_riesgo_coe,
  descripcion: item.descripcion,
  protocolo_coe: item.protocolo_coe,
  unidades_despacho: item.unidades_despacho || [],
  tiempoRespuestaObjetivo: item.indicadores_operativos?.tiempo_respuesta_objetivo_min ?? null,
  requiereSINAPROC: item.indicadores_operativos?.requiere_reporte_sinaproc ?? false,
  palabrasClave: item.palabras_clave || [],
})

// Transformar dependencias del JSON al schema de Mongoose
const transformarDependencia = (item) => ({
  clave: item._id_dependencia,
  nombreCorto: item.nombre_corto,
  nombreOficial: item.nombre_oficial,
  nivelGobierno: item.nivel_gobierno,
  tipoServicio: item.tipo_servicio,
  estadoOperativo: item.estado_operativo,
  descripcion: item.descripcion,
  visibleEnUI: item.configuracion_ui?.mostrar_en_checkbox ?? true,
  grupoUI: item.configuracion_ui?.grupo_categoria ?? '',
  iconoSugerido: item.configuracion_ui?.icono_sugerido ?? 'shield',
})

// ── Seed principal ────────────────────────────────────────────────────────────
const seed = async () => {
  try {
    await conectarDB()
    console.log('\n🌱 Iniciando seed de la base de datos...\n')

    // ── 1. Colonias ───────────────────────────────────────────────────────────
    const coloniaCount = await Colonia.countDocuments()
    if (coloniaCount === 0) {
      console.log('📍 Insertando colonias de Zapopan...')
      const colonias = parsearCSVColonias()
      await Colonia.insertMany(colonias, { ordered: false })
      console.log(`   ✅ ${colonias.length} colonias insertadas`)
    } else {
      console.log(`   ⏭️  Colonias ya existen (${coloniaCount}), omitiendo`)
    }

    // ── 2. Catálogo de incidentes ─────────────────────────────────────────────
    const incidenteCount = await CatalogoIncidente.countDocuments()
    if (incidenteCount === 0) {
      console.log('🚨 Insertando catálogo de incidentes CNIE...')
      const rawIncidentes = leerJSON('../../coe_zapopan_100_incidentes_mongo.json')
      if (rawIncidentes) {
        const incidentes = rawIncidentes.map(transformarIncidente)
        await CatalogoIncidente.insertMany(incidentes, { ordered: false })
        console.log(`   ✅ ${incidentes.length} incidentes insertados`)
      }
    } else {
      console.log(`   ⏭️  Incidentes ya existen (${incidenteCount}), omitiendo`)
    }

    // ── 3. Dependencias ───────────────────────────────────────────────────────
    const depCount = await Dependencia.countDocuments()
    if (depCount === 0) {
      console.log('🏛️  Insertando catálogo de dependencias...')
      const rawDeps = leerJSON('../../dependencias_mongo.json')
      if (rawDeps) {
        const dependencias = rawDeps.map(transformarDependencia)
        await Dependencia.insertMany(dependencias, { ordered: false })
        console.log(`   ✅ ${dependencias.length} dependencias insertadas`)
      }
    } else {
      console.log(`   ⏭️  Dependencias ya existen (${depCount}), omitiendo`)
    }

    // ── 4. Usuario admin e iniciales ───────────────────────────────────────────
    let adminExiste = await Usuario.findOne({ email: 'admin@coe.zapopan.gob.mx' })
    if (!adminExiste) {
      console.log('👤 Creando usuario admin inicial...')
      await Usuario.create({
        nombre: 'Administrador COE',
        email: 'admin@coe.zapopan.gob.mx',
        passwordHash: 'Admin2026!',
        rol: 'admin',
      })
      console.log('   ✅ Admin creado: admin@coe.zapopan.gob.mx / Admin2026!')
    } else {
      adminExiste.rol = 'admin'
      await adminExiste.save()
      console.log('   ✅ Usuario admin verificado (rol: admin)')
    }

    // Usuario operador de prueba
    let opExiste = await Usuario.findOne({ email: 'operador1@coe.zapopan.gob.mx' })
    if (!opExiste) {
      console.log('👤 Creando usuario operador de pruebas...')
      await Usuario.create({
        nombre: 'Operador COE 1',
        email: 'operador1@coe.zapopan.gob.mx',
        passwordHash: 'Operador2026!',
        rol: 'operador',
      })
      console.log('   ✅ Operador creado: operador1@coe.zapopan.gob.mx / Operador2026!')
    } else {
      console.log('   ⏭️  Operador ya existe, omitiendo')
    }

    // ── 5. Unidades de ejemplo ────────────────────────────────────────────────
    const unidadCount = await Unidad.countDocuments()
    if (unidadCount === 0) {
      console.log('🚒 Insertando unidades de ejemplo...')
      const unidades = [
        { nombre: 'Bomba 1', tipo: 'Bomba', base: 'Base 1 — Zapopan Centro', responsable: 'Cap. García', turno: 'vespertino', estado: 'disponible' },
        { nombre: 'Bomba 2', tipo: 'Bomba', base: 'Base 2 — Tesistán', responsable: 'Cap. López', turno: 'vespertino', estado: 'disponible' },
        { nombre: 'Bomba 3', tipo: 'Bomba', base: 'Base 3 — Santa Margarita', responsable: 'Sgt. Ramírez', turno: 'vespertino', estado: 'disponible' },
        { nombre: 'Rescate 1', tipo: 'Rescate', base: 'Base 1 — Zapopan Centro', responsable: 'Tte. Hernández', turno: 'vespertino', estado: 'disponible' },
        { nombre: 'Ambulancia 1', tipo: 'Ambulancia', base: 'Base 1 — Zapopan Centro', responsable: 'Param. Torres', turno: 'vespertino', estado: 'disponible' },
        { nombre: 'Ambulancia 2', tipo: 'Ambulancia', base: 'Base 2 — Tesistán', responsable: 'Param. Ruiz', turno: 'vespertino', estado: 'disponible' },
      ]
      await Unidad.insertMany(unidades, { ordered: false })
      console.log(`   ✅ ${unidades.length} unidades insertadas`)
    } else {
      console.log(`   ⏭️  Unidades ya existen (${unidadCount}), omitiendo`)
    }

    // ── 6. Usuario de campo de ejemplo ──────────────────────────────────────────
    const campoExiste = await Usuario.findOne({ email: 'bomba1@coe.zapopan.gob.mx' })
    if (!campoExiste) {
      console.log('👤 Creando usuario de campo de pruebas (Bomba 1)...')
      const bomba1 = await Unidad.findOne({ nombre: 'Bomba 1' })
      await Usuario.create({
        nombre: 'Bomba 1 - Zapopan',
        email: 'bomba1@coe.zapopan.gob.mx',
        passwordHash: 'Campo2026!',
        rol: 'campo',
        unidadAsignada: bomba1 ? bomba1._id : null
      })
      console.log('   ✅ Usuario de campo creado: bomba1@coe.zapopan.gob.mx / Campo2026!')
    } else {
      console.log('   ⏭️  Usuario de campo ya existe, omitiendo')
    }

    console.log('\n✨ Seed completado exitosamente\n')
  } catch (error) {
    console.error('\n❌ Error durante el seed:', error.message)
  } finally {
    await mongoose.disconnect()
    process.exit(0)
  }
}

seed()
