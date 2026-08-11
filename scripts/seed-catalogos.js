import 'dotenv/config'
import mongoose from 'mongoose'
import conectarDB from '../src/config/db.js'
import Dependencia from '../src/models/Dependencia.js'
import CatalogoIncidente from '../src/models/CatalogoIncidente.js'
import Colonia from '../src/models/Colonia.js'

const dependenciasSemilla = [
  {
    clave: 'DEP-001',
    nombreCorto: 'PCyBZ',
    nombreOficial: 'Protección Civil y Bomberos Zapopan',
    nivelGobierno: 'Municipal',
    tipoServicio: 'Bomberos / Rescate',
    estadoOperativo: 'Activo',
    descripcion: 'Cuerpo oficial de bomberos y protección civil de Zapopan',
    visibleEnUI: true,
    grupoUI: 'Emergencias Principales',
    iconoSugerido: 'fire'
  },
  {
    clave: 'DEP-002',
    nombreCorto: 'Comisaría',
    nombreOficial: 'Comisaría General de Seguridad Pública de Zapopan',
    nivelGobierno: 'Municipal',
    tipoServicio: 'Seguridad Pública',
    estadoOperativo: 'Activo',
    descripcion: 'Policía municipal de Zapopan',
    visibleEnUI: true,
    grupoUI: 'Seguridad',
    iconoSugerido: 'shield'
  },
  {
    clave: 'DEP-003',
    nombreCorto: 'Policía Vial',
    nombreOficial: 'Policía Vial del Estado de Jalisco',
    nivelGobierno: 'Estatal',
    tipoServicio: 'Tránsito y Vialidad',
    estadoOperativo: 'Activo',
    descripcion: 'Control de tránsito y peritaje vehicular en Jalisco',
    visibleEnUI: true,
    grupoUI: 'Vialidad',
    iconoSugerido: 'truck'
  },
  {
    clave: 'DEP-004',
    nombreCorto: 'Cruz Verde',
    nombreOficial: 'Servicios Médicos Municipales - Cruz Verde Zapopan',
    nivelGobierno: 'Municipal',
    tipoServicio: 'Atención Prehospitalaria / Médica',
    estadoOperativo: 'Activo',
    descripcion: 'Ambulancias y urgencias médicas de Zapopan',
    visibleEnUI: true,
    grupoUI: 'Salud',
    iconoSugerido: 'heart'
  },
  {
    clave: 'DEP-005',
    nombreCorto: 'Cruz Roja',
    nombreOficial: 'Cruz Roja Mexicana Delegación Jalisco',
    nivelGobierno: 'Privado / Voluntariado',
    tipoServicio: 'Atención Prehospitalaria',
    estadoOperativo: 'Activo',
    descripcion: 'Ambulancias y socorros de emergencia',
    visibleEnUI: true,
    grupoUI: 'Salud',
    iconoSugerido: 'plus'
  },
  {
    clave: 'DEP-006',
    nombreCorto: 'Inspección',
    nombreOficial: 'Dirección de Inspección y Vigilancia Zapopan',
    nivelGobierno: 'Municipal',
    tipoServicio: 'Regulación y Clausuras',
    estadoOperativo: 'Activo',
    descripcion: 'Verificación de giros comerciales e inmuebles',
    visibleEnUI: true,
    grupoUI: 'Gobierno',
    iconoSugerido: 'file'
  },
  {
    clave: 'DEP-007',
    nombreCorto: 'SIAPA',
    nombreOficial: 'Sistema Intermunicipal de Agua Potable y Alcantarillado',
    nivelGobierno: 'Estatal',
    tipoServicio: 'Agua y Alcantarillado',
    estadoOperativo: 'Activo',
    descripcion: 'Atención a fugas de agua potable y socavones',
    visibleEnUI: true,
    grupoUI: 'Servicios Públicos',
    iconoSugerido: 'droplet'
  },
  {
    clave: 'DEP-008',
    nombreCorto: 'CFE',
    nombreOficial: 'Comisión Federal de Electricidad',
    nivelGobierno: 'Federal',
    tipoServicio: 'Energía Eléctrica',
    estadoOperativo: 'Activo',
    descripcion: 'Atención a cables caídos y transformadores',
    visibleEnUI: true,
    grupoUI: 'Servicios Públicos',
    iconoSugerido: 'zap'
  },
  {
    clave: 'DEP-009',
    nombreCorto: 'SEMEFO / FGE',
    nombreOficial: 'Instituto Jalisciense de Ciencias Forenses',
    nivelGobierno: 'Estatal',
    tipoServicio: 'Pericial / Forense',
    estadoOperativo: 'Activo',
    descripcion: 'Peritaje e investigación de fallecidos',
    visibleEnUI: true,
    grupoUI: 'Pericial',
    iconoSugerido: 'activity'
  }
]

const incidentesSemilla = [
  {
    codigo_cnie: 'ACC-001',
    nombre: 'Choque Vehicular con Prensados',
    categoria: 'Accidente / Tránsito',
    subcategoria: 'Vehicular',
    prioridadSugerida: 'Crítica',
    descripcion: 'Colisión vehicular grave con personas atrapadas o prensadas',
    protocolo_coe: 'Despachar equipo de rescate urbano + ambulancia + policía vial de inmediato',
    unidades_despacho: ['Rescate', 'Ambulancia', 'Bomba'],
    tiempoRespuestaObjetivo: 8,
    requiereSINAPROC: true,
    palabrasClave: ['choque', 'prensados', 'accidente', 'volcadura', 'vehiculo']
  },
  {
    codigo_cnie: 'ACC-002',
    nombre: 'Volcadura de Vehículo',
    categoria: 'Accidente / Tránsito',
    subcategoria: 'Vehicular',
    prioridadSugerida: 'Alta',
    descripcion: 'Volcadura sobre vía pública o barranco',
    protocolo_coe: 'Despachar ambulancia y unidad de rescate/bomba',
    unidades_despacho: ['Ambulancia', 'Bomba'],
    tiempoRespuestaObjetivo: 10,
    requiereSINAPROC: false,
    palabrasClave: ['volcadura', 'choque', 'barranco', 'carro']
  },
  {
    codigo_cnie: 'FAU-001',
    nombre: 'Panal de Abejas / Enjambre en Riesgo',
    categoria: 'Fauna Nociva',
    subcategoria: 'Abejas / Enjambres',
    prioridadSugerida: 'Media',
    descripcion: 'Presencia de panal o enjambre con riesgo de ataque a transeúntes',
    protocolo_coe: 'Despachar unidad ligera con equipo apícola de captura/acordonamiento',
    unidades_despacho: ['Bomba', 'Rescate'],
    tiempoRespuestaObjetivo: 15,
    requiereSINAPROC: false,
    palabrasClave: ['abejas', 'panal', 'enjambre', 'picadura', 'avispas']
  },
  {
    codigo_cnie: 'INC-001',
    nombre: 'Incendio en Casa Habitación',
    categoria: 'Incendios',
    subcategoria: 'Estructural',
    prioridadSugerida: 'Crítica',
    descripcion: 'Fuego activo en finca o vivienda habitada',
    protocolo_coe: 'Despachar 2 motobombas + ambulancia en prevención + policía',
    unidades_despacho: ['Bomba', 'Ambulancia'],
    tiempoRespuestaObjetivo: 7,
    requiereSINAPROC: true,
    palabrasClave: ['incendio', 'fuego', 'casa', 'humo', 'quemado']
  },
  {
    codigo_cnie: 'INC-002',
    nombre: 'Incendio Forestal / Pastizal',
    categoria: 'Incendios',
    subcategoria: 'Forestal / Maleza',
    prioridadSugerida: 'Alta',
    descripcion: 'Incendio de pastizal o maleza con riesgo de propagación',
    protocolo_coe: 'Despachar brigada forestal / motobomba ligera',
    unidades_despacho: ['Bomba'],
    tiempoRespuestaObjetivo: 12,
    requiereSINAPROC: false,
    palabrasClave: ['forestal', 'pastizal', 'maleza', 'cerro', 'bosque']
  },
  {
    codigo_cnie: 'HAZ-001',
    nombre: 'Fuga de Gas L.P. en Tanque / Finca',
    categoria: 'HazMat / Sustancias',
    subcategoria: 'Fuga de Gas',
    prioridadSugerida: 'Crítica',
    descripcion: 'Escape de gas en tanque estacionario, cilindro o línea de suministro',
    protocolo_coe: 'Despachar motobomba para supresión y evacuación preventiva',
    unidades_despacho: ['Bomba'],
    tiempoRespuestaObjetivo: 8,
    requiereSINAPROC: true,
    palabrasClave: ['gas', 'fuga', 'olor', 'tanque', 'explosion']
  },
  {
    codigo_cnie: 'MED-001',
    nombre: 'Emergencia Médica / Paro Cardiorrespiratorio',
    categoria: 'Salud',
    subcategoria: 'Prehospitalaria',
    prioridadSugerida: 'Crítica',
    descripcion: 'Persona inconsciente o sufriendo evento cardiovascular grave',
    protocolo_coe: 'Despachar soporte vital avanzado de inmediato',
    unidades_despacho: ['Ambulancia'],
    tiempoRespuestaObjetivo: 6,
    requiereSINAPROC: false,
    palabrasClave: ['medica', 'infarto', 'inconsciente', 'paro', 'respiracion']
  },
  {
    codigo_cnie: 'DES-001',
    nombre: 'Caída de Árbol / Poste sobre Vía Pública',
    categoria: 'Infraestructura',
    subcategoria: 'Obstrucción',
    prioridadSugerida: 'Media',
    descripcion: 'Árbol o cableado caído afectando circulación o riesgo eléctrico',
    protocolo_coe: 'Despachar rescate/bomba para troceo y acordonamiento con CFE',
    unidades_despacho: ['Rescate', 'Bomba'],
    tiempoRespuestaObjetivo: 15,
    requiereSINAPROC: false,
    palabrasClave: ['arbol', 'poste', 'cables', 'caida', 'bloqueo']
  }
]

const coloniasSemilla = [
  // ── Centro / Basílica ─────────────────────────────────────────────────────
  { nombre: 'Zapopan Centro', tipo: 'Colonia', codigoPostal: '45100' },
  { nombre: 'Artesanos', tipo: 'Colonia', codigoPostal: '45100' },
  { nombre: 'La Federacha', tipo: 'Colonia', codigoPostal: '45100' },
  { nombre: 'El Vigía', tipo: 'Colonia', codigoPostal: '45100' },
  { nombre: 'Zapopan 2000', tipo: 'Colonia', codigoPostal: '45100' },
  // ── Puerta de Hierro / Andares ────────────────────────────────────────────
  { nombre: 'Puerta de Hierro', tipo: 'Fraccionamiento', codigoPostal: '45116' },
  { nombre: 'Andares', tipo: 'Fraccionamiento', codigoPostal: '45116' },
  { nombre: 'Villa Universitaria', tipo: 'Fraccionamiento', codigoPostal: '45110' },
  { nombre: 'Terranova', tipo: 'Fraccionamiento', codigoPostal: '45110' },
  { nombre: 'Colinas de San Javier', tipo: 'Fraccionamiento', codigoPostal: '45110' },
  // ── Valle Real / La Cima ──────────────────────────────────────────────────
  { nombre: 'Valle Real', tipo: 'Fraccionamiento', codigoPostal: '45138' },
  { nombre: 'La Cima', tipo: 'Fraccionamiento', codigoPostal: '45134' },
  { nombre: 'Jardín Real', tipo: 'Fraccionamiento', codigoPostal: '45136' },
  { nombre: 'Hacienda Real Tejeda', tipo: 'Fraccionamiento', codigoPostal: '45136' },
  { nombre: 'Residencial Victoria', tipo: 'Fraccionamiento', codigoPostal: '45136' },
  { nombre: 'Coto Buena Vista', tipo: 'Fraccionamiento', codigoPostal: '45134' },
  { nombre: 'Bosques de San Isidro', tipo: 'Fraccionamiento', codigoPostal: '45132' },
  { nombre: 'Los Laureles', tipo: 'Fraccionamiento', codigoPostal: '45132' },
  // ── Ciudad Granja ─────────────────────────────────────────────────────────
  { nombre: 'Ciudad Granja', tipo: 'Fraccionamiento', codigoPostal: '45010' },
  { nombre: 'Granjas Audi', tipo: 'Colonia', codigoPostal: '45010' },
  { nombre: 'Las Granjas', tipo: 'Colonia', codigoPostal: '45010' },
  { nombre: 'Granjas Estrella', tipo: 'Colonia', codigoPostal: '45010' },
  // ── Loma Dorada ───────────────────────────────────────────────────────────
  { nombre: 'Loma Dorada', tipo: 'Fraccionamiento', codigoPostal: '45418' },
  { nombre: 'Loma Dorada Secc. A', tipo: 'Fraccionamiento', codigoPostal: '45418' },
  { nombre: 'Loma Dorada Secc. B', tipo: 'Fraccionamiento', codigoPostal: '45418' },
  { nombre: 'Loma Real', tipo: 'Fraccionamiento', codigoPostal: '45418' },
  { nombre: 'Loma Bonita Ejidal', tipo: 'Colonia', codigoPostal: '45086' },
  // ── Santa Margarita / Las Américas ────────────────────────────────────────
  { nombre: 'Santa Margarita', tipo: 'Fraccionamiento', codigoPostal: '45140' },
  { nombre: 'Santa Margarita Secc. II', tipo: 'Fraccionamiento', codigoPostal: '45140' },
  { nombre: 'Las Américas', tipo: 'Fraccionamiento', codigoPostal: '45084' },
  { nombre: 'Santa María del Pueblito', tipo: 'Colonia', codigoPostal: '45084' },
  // ── Las Águilas ───────────────────────────────────────────────────────────
  { nombre: 'Las Águilas', tipo: 'Colonia', codigoPostal: '45080' },
  { nombre: 'Las Águilas Secc. II', tipo: 'Colonia', codigoPostal: '45080' },
  { nombre: 'Jardines de las Águilas', tipo: 'Fraccionamiento', codigoPostal: '45080' },
  // ── Miramar / Ciudad del Sol ──────────────────────────────────────────────
  { nombre: 'Miramar', tipo: 'Colonia', codigoPostal: '45060' },
  { nombre: 'Ciudad del Sol', tipo: 'Fraccionamiento', codigoPostal: '45050' },
  { nombre: 'Arcos Sur', tipo: 'Fraccionamiento', codigoPostal: '45046' },
  { nombre: 'El Tigre', tipo: 'Colonia', codigoPostal: '45050' },
  { nombre: 'Parques de Zapopan', tipo: 'Fraccionamiento', codigoPostal: '45068' },
  { nombre: 'Satélite', tipo: 'Fraccionamiento', codigoPostal: '45050' },
  { nombre: 'El Mirador', tipo: 'Fraccionamiento', codigoPostal: '45050' },
  // ── Tabachines / Atemajac ─────────────────────────────────────────────────
  { nombre: 'Tabachines', tipo: 'Fraccionamiento', codigoPostal: '45188' },
  { nombre: 'Tabachines Secc. A', tipo: 'Fraccionamiento', codigoPostal: '45188' },
  { nombre: 'Las Jacarandas', tipo: 'Fraccionamiento', codigoPostal: '45188' },
  { nombre: 'Atemajac del Valle', tipo: 'Pueblo', codigoPostal: '45190' },
  { nombre: 'San Isidro Ejidal', tipo: 'Ejido', codigoPostal: '45199' },
  // ── El Colli / Paseos del Sol ─────────────────────────────────────────────
  { nombre: 'El Colli Urbano', tipo: 'Colonia', codigoPostal: '45070' },
  { nombre: 'Paseos del Sol', tipo: 'Fraccionamiento', codigoPostal: '45070' },
  { nombre: 'El Colli Ejidal', tipo: 'Ejido', codigoPostal: '45070' },
  { nombre: 'La Calma', tipo: 'Colonia', codigoPostal: '45070' },
  { nombre: 'Pinar de la Calma', tipo: 'Fraccionamiento', codigoPostal: '45070' },
  { nombre: 'Arenales Tapatíos', tipo: 'Fraccionamiento', codigoPostal: '45069' },
  { nombre: 'Naciones Unidas', tipo: 'Fraccionamiento', codigoPostal: '45079' },
  // ── Constitución / 18 de Marzo ────────────────────────────────────────────
  { nombre: 'Constitución', tipo: 'Colonia', codigoPostal: '45180' },
  { nombre: 'La Estancia', tipo: 'Colonia', codigoPostal: '45030' },
  { nombre: 'Insurgentes', tipo: 'Colonia', codigoPostal: '45180' },
  { nombre: 'La Joya', tipo: 'Colonia', codigoPostal: '45180' },
  { nombre: '18 de Marzo', tipo: 'Colonia', codigoPostal: '45180' },
  { nombre: 'Echeverría', tipo: 'Colonia', codigoPostal: '45180' },
  { nombre: 'Prolongación Francisco Villa', tipo: 'Colonia', codigoPostal: '45180' },
  // ── Tesistán / Nextipac ───────────────────────────────────────────────────
  { nombre: 'San Francisco Tesistán', tipo: 'Pueblo', codigoPostal: '45200' },
  { nombre: 'La Venta del Astillero', tipo: 'Pueblo', codigoPostal: '45202' },
  { nombre: 'El Batan', tipo: 'Pueblo', codigoPostal: '45203' },
  { nombre: 'Nextipac', tipo: 'Pueblo', codigoPostal: '45220' },
  { nombre: 'Jocotán', tipo: 'Pueblo', codigoPostal: '45222' },
  { nombre: 'Tepejillo', tipo: 'Pueblo', codigoPostal: '45225' },
  { nombre: 'Nuevo México', tipo: 'Colonia', codigoPostal: '45200' },
  // ── Ávila Camacho / Moctezuma ─────────────────────────────────────────────
  { nombre: 'Ávila Camacho', tipo: 'Colonia', codigoPostal: '45040' },
  { nombre: 'Moctezuma', tipo: 'Colonia', codigoPostal: '45090' },
  { nombre: 'Francisco Villa', tipo: 'Colonia', codigoPostal: '45040' },
  { nombre: 'Balcones de Santa María', tipo: 'Fraccionamiento', codigoPostal: '45040' },
  { nombre: 'La Esperanza', tipo: 'Colonia', codigoPostal: '45040' },
  // ── La Providencia / Mesa Colorada ────────────────────────────────────────
  { nombre: 'La Providencia', tipo: 'Colonia', codigoPostal: '45170' },
  { nombre: 'Mesa Colorada Poniente', tipo: 'Colonia', codigoPostal: '45170' },
  { nombre: 'Mesa Colorada Oriente', tipo: 'Colonia', codigoPostal: '45170' },
  { nombre: 'La Cruz del Cuatro', tipo: 'Colonia', codigoPostal: '45160' },
  // ── Tepeyac / Rancho Nuevo ────────────────────────────────────────────────
  { nombre: 'Tepeyac', tipo: 'Colonia', codigoPostal: '45150' },
  { nombre: 'Rancho Nuevo', tipo: 'Colonia', codigoPostal: '45150' },
  { nombre: 'Copala', tipo: 'Colonia', codigoPostal: '45154' },
  { nombre: 'Nuevo Perú', tipo: 'Colonia', codigoPostal: '45160' },
  // ── Periférico / Industrial ───────────────────────────────────────────────
  { nombre: 'Zona Industrial', tipo: 'Zona Industrial', codigoPostal: '45000' },
  { nombre: 'Industrial Belenes', tipo: 'Zona Industrial', codigoPostal: '45020' },
  { nombre: 'Santa Lucía', tipo: 'Colonia', codigoPostal: '45020' },
  { nombre: 'El Fortín', tipo: 'Colonia', codigoPostal: '45020' },
  { nombre: 'La Maestranza', tipo: 'Colonia', codigoPostal: '45020' },
  // ── Jardines / Flores ─────────────────────────────────────────────────────
  { nombre: 'Jardines de la Cruz', tipo: 'Colonia', codigoPostal: '44950' },
  { nombre: 'Jardines del Valle', tipo: 'Fraccionamiento', codigoPostal: '45067' },
  { nombre: 'Colinas de las Flores', tipo: 'Fraccionamiento', codigoPostal: '45086' },
  { nombre: 'Las Flores', tipo: 'Colonia', codigoPostal: '45086' },
  // ── San Juan de Ocotán / El Palomar ───────────────────────────────────────
  { nombre: 'San Juan de Ocotán', tipo: 'Pueblo', codigoPostal: '45019' },
  { nombre: 'El Palomar', tipo: 'Fraccionamiento', codigoPostal: '45640' },
  { nombre: 'Rancho Contento', tipo: 'Fraccionamiento', codigoPostal: '45645' },
  // ── Sur / Toluquilla ──────────────────────────────────────────────────────
  { nombre: 'Toluquilla', tipo: 'Ejido', codigoPostal: '45640' },
  { nombre: 'La Mezquitera', tipo: 'Colonia', codigoPostal: '45640' },
  { nombre: 'San Agustín', tipo: 'Colonia', codigoPostal: '45640' },
  { nombre: 'El Tapatío', tipo: 'Fraccionamiento', codigoPostal: '45620' },
  // ── Localidades periféricas ───────────────────────────────────────────────
  { nombre: 'Zapopanito', tipo: 'Pueblo', codigoPostal: '45400' },
  { nombre: 'Las Pintitas', tipo: 'Pueblo', codigoPostal: '45394' },
  { nombre: 'El Quince', tipo: 'Localidad', codigoPostal: '45398' },
  { nombre: 'Picacho', tipo: 'Colonia', codigoPostal: '45406' },
  { nombre: 'Santa Cruz del Valle', tipo: 'Colonia', codigoPostal: '45653' },
  { nombre: 'El Sauz', tipo: 'Colonia', codigoPostal: '45400' },
  { nombre: 'La Tijera', tipo: 'Colonia', codigoPostal: '45400' },
  // ── Lomas de Zapopan / Residenciales ──────────────────────────────────────
  { nombre: 'Lomas de Zapopan', tipo: 'Fraccionamiento', codigoPostal: '45130' },
  { nombre: 'Residencial Poniente', tipo: 'Fraccionamiento', codigoPostal: '45610' },
  { nombre: 'Las Carmelitas', tipo: 'Colonia', codigoPostal: '45160' },
  { nombre: 'Laureles Estadio', tipo: 'Colonia', codigoPostal: '44934' },
  { nombre: 'El Campesino', tipo: 'Colonia', codigoPostal: '45612' },
  { nombre: 'Base Aérea', tipo: 'Colonia', codigoPostal: '45147' },
  { nombre: 'Las Palmas', tipo: 'Fraccionamiento', codigoPostal: '45070' },
  { nombre: 'La Tuzanía', tipo: 'Colonia', codigoPostal: '45034' },
  { nombre: 'Residencial Santa Margarita', tipo: 'Fraccionamiento', codigoPostal: '45140' },
  { nombre: 'Jardines de Nuevo México', tipo: 'Fraccionamiento', codigoPostal: '45200' },
  { nombre: 'Las Bóvedas', tipo: 'Fraccionamiento', codigoPostal: '45130' },
  { nombre: 'Colegio del Aire', tipo: 'Colonia', codigoPostal: '45147' },
  { nombre: 'Santa Fe', tipo: 'Fraccionamiento', codigoPostal: '45130' },
  { nombre: 'Altamira', tipo: 'Colonia', codigoPostal: '45090' },
  { nombre: 'Arcos de Zapopan', tipo: 'Fraccionamiento', codigoPostal: '45130' },
  { nombre: 'La Soledad', tipo: 'Colonia', codigoPostal: '45200' },
]

const sembrarCatalogos = async () => {
  try {
    await conectarDB()
    console.log('\n🚀 Sembrando Catálogos Oficiales de COE Zapopan...\n')

    // 1. Dependencias
    console.log('🏛️  Insertando Dependencias de Apoyo...')
    for (const dep of dependenciasSemilla) {
      await Dependencia.findOneAndUpdate({ clave: dep.clave }, dep, { upsert: true, new: true })
    }
    console.log(`   ✅ ${dependenciasSemilla.length} dependencias insertadas/actualizadas.`)

    // 2. Catálogo de Incidentes
    console.log('🚨 Insertando Catálogo de Incidentes (Tipos de emergencia)...')
    for (const inc of incidentesSemilla) {
      await CatalogoIncidente.findOneAndUpdate({ codigo_cnie: inc.codigo_cnie }, inc, { upsert: true, new: true })
    }
    console.log(`   ✅ ${incidentesSemilla.length} incidentes CNIE insertados/actualizados.`)

    // 3. Colonias
    console.log('📍 Insertando Colonias de Zapopan...')
    for (const col of coloniasSemilla) {
      await Colonia.findOneAndUpdate({ nombre: col.nombre }, col, { upsert: true, new: true })
    }
    console.log(`   ✅ ${coloniasSemilla.length} colonias insertadas/actualizadas.`)

    console.log('\n✨ Catálogos oficiales sembrados exitosamente.\n')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error al sembrar catálogos:', err.message)
    process.exit(1)
  }
}

sembrarCatalogos()
