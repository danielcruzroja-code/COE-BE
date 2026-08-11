import mongoose from 'mongoose'

// Genera folio automático: EMG-2026-0001
const generarFolio = async () => {
  const año = new Date().getFullYear()
  const prefijo = `EMG-${año}-`
  const ultimo = await Emergencia.findOne(
    { folio: { $regex: `^${prefijo}` } },
    { folio: 1 },
    { sort: { folio: -1 } }
  )
  if (!ultimo) return `${prefijo}0001`
  const num = parseInt(ultimo.folio.split('-')[2]) + 1
  return `${prefijo}${String(num).padStart(4, '0')}`
}

const emergenciaSchema = new mongoose.Schema(
  {
    folio: {
      type: String,
      unique: true,
    },
    // Referencia al catálogo de incidentes
    catalogoIncidente: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CatalogoIncidente',
      default: null,
    },
    tipo: {
      type: String,
      required: [true, 'El tipo de emergencia es requerido'],
    },
    subtipo: {
      type: String,
      default: '',
    },
    ubicacion: {
      calle: { type: String, default: '' },
      numeroExterior: { type: String, default: '' },
      numeroInterior: { type: String, default: '' },
      colonia: { type: String, default: '' },
      referencias: { type: String, default: '' },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      direccionCompleta: { type: String, default: '' }
    },
    prioridad: {
      type: String,
      enum: ['baja', 'media', 'alta', 'critica'],
      required: true,
    },
    estado: {
      type: String,
      enum: ['nuevo', 'asignado', 'en_atencion', 'cerrado'],
      default: 'nuevo',
    },
    unidadAsignada: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Unidad',
      default: null,
    },
    dependenciasApoyo: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dependencia',
      },
    ],
    operadorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Usuario',
      required: true,
    },
    personas: { type: Number, default: 0 },
    animales: { type: Number, default: 0 },
    notas: { type: String, default: '' },
    telefonoContacto: { type: String, default: '' },
    nombreContacto: { type: String, default: '' },
    // Timestamps de negocio
    tiempoReporte: { type: Date, default: Date.now },
    tiempoAsignacion: { type: Date, default: null },
    tiempoAceptacion: { type: Date, default: null },
    tiempoEscena: { type: Date, default: null },
    tiempoCierre: { type: Date, default: null },
    // Reporte detallado de la unidad en campo (FO-DO-03)
    reporteCampo: {
      // 1. Llegada y Evaluación
      oficialCargo: { type: String, default: '' },
      descripcionLlegada: { type: String, default: '' },
      entrevistado: {
        nombre: { type: String, default: '' },
        tipo: { type: String, default: '' }, // Propietario, testigo, etc.
        refiere: { type: String, default: '' },
      },
      
      // 2. Plan de Acción y SCI
      planAccion: { type: String, default: '' },
      objetivos: { type: String, default: '' },
      estrategias: { type: String, default: '' },
      tacticas: { type: String, default: '' },
      mando: {
        cmdteIncidente: { type: String, default: '' },
        seguridad: { type: String, default: '' },
        operaciones: { type: String, default: '' },
        planificacion: { type: String, default: '' },
        logistica: { type: String, default: '' },
      },
      recursosNecesarios: { type: String, default: '' },
      mensajeSeguridad: { type: String, default: '' },

      // 3. Causas y Daños
      posiblesCausas: { type: String, default: '' },
      danosVisibles: { type: String, default: '' },
      perdidasEvitadas: { type: Boolean, default: false },

      // 4. Víctimas
      victimasTotal: { type: Number, default: 0 },
      lesionados: { type: Number, default: 0 }, // Compatibilidad hacia atrás
      lesionadosDetalle: {
        ilesos: { type: Number, default: 0 },
        leves: { type: Number, default: 0 }, // Verde
        regulares: { type: Number, default: 0 }, // Amarillo
        graves: { type: Number, default: 0 }, // Rojo / Peligra vida
        prensados: { type: Number, default: 0 },
      },
      fallecidos: { type: Number, default: 0 },
      rescatados: { type: Number, default: 0 },
      observacionesVictimas: { type: String, default: '' },
      trasladadosPor: { type: String, default: '' },

      // 5. Cierre y Entrega
      dependenciasPresentes: [
        {
          nombre: { type: String, default: '' }, // Ej. Comisaria, Cruz Verde
          unidad: { type: String, default: '' },
          aCargo: { type: String, default: '' },
        }
      ],
      primerRespondiente: { type: String, default: '' },
      primerInterviniente: { type: String, default: '' },
      personalAsistente: { type: String, default: '' },
      consumoTotal: { type: String, default: '' },
      aCargoAlRetiro: { type: String, default: '' },
      bienesEntregadosA: { type: String, default: '' },
      observacionesGenerales: { type: String, default: '' },

      // 6. Específicos por Tipo de Incidente
      // Aquí se guarda todo lo dinámico: Fugas (sustancia, contenedor, porcentaje), Incendios (material, dictamen), etc.
      detallesEspecificos: { type: mongoose.Schema.Types.Mixed, default: {} },
      
      vehiculosInvolucrados: [
        {
          tipo: { type: String, default: '' },
          marca: { type: String, default: '' },
          modelo: { type: String, default: '' },
          placas: { type: String, default: '' },
          color: { type: String, default: '' },
          conductor: { type: String, default: '' }, // Nombre del conductor
          impactoCon: { type: String, default: '' } // Con qué chocó
        },
      ],

      // Imágenes y multimedia
      imagenEscenaUrl: { type: String, default: '' },
    },
    // Telegram: si ya se envió el mensaje de despacho
    telegramEnviado: { type: Boolean, default: false },
  },
  {
    timestamps: true,
  }
)

// Pre-save: asigna folio automático
emergenciaSchema.pre('save', async function (next) {
  if (!this.folio) {
    this.folio = await generarFolio()
  }
  next()
})

// Índices útiles para queries del dashboard
emergenciaSchema.index({ estado: 1 })
emergenciaSchema.index({ tiempoReporte: -1 })

const Emergencia = mongoose.model('Emergencia', emergenciaSchema)
export default Emergencia
