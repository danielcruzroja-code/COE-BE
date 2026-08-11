import Emergencia from '../models/Emergencia.js'
import Unidad from '../models/Unidad.js'
import { enviarNuevoIncidente, enviarDespacho, enviarActualizacionTelegram } from '../services/telegram.service.js'

// ── GET /api/emergencias ──────────────────────────────────────────────────────
// Query params: estado, prioridad, desde, hasta, pagina, limite
export const listar = async (req, res) => {
  try {
    const {
      estado,
      prioridad,
      desde,
      hasta,
      pagina = 1,
      limite = 50,
    } = req.query

    const filtro = {}
    if (estado) filtro.estado = estado
    if (prioridad) filtro.prioridad = prioridad
    if (desde || hasta) {
      filtro.tiempoReporte = {}
      if (desde) filtro.tiempoReporte.$gte = new Date(desde)
      if (hasta) filtro.tiempoReporte.$lte = new Date(hasta)
    }

    const skip = (Number(pagina) - 1) * Number(limite)

    const [emergencias, total] = await Promise.all([
      Emergencia.find(filtro)
        .populate('unidadAsignada', 'nombre tipo estado')
        .populate('operadorId', 'nombre')
        .sort({ tiempoReporte: -1 })
        .skip(skip)
        .limit(Number(limite)),
      Emergencia.countDocuments(filtro),
    ])

    res.json({
      emergencias,
      total,
      pagina: Number(pagina),
      totalPaginas: Math.ceil(total / Number(limite)),
    })
  } catch (error) {
    console.error('Error al listar emergencias:', error)
    res.status(500).json({ mensaje: 'Error al obtener emergencias' })
  }
}

// ── GET /api/emergencias/activas ──────────────────────────────────────────────
// Devuelve emergencias no cerradas para el mapa/lista principal
export const listarActivas = async (req, res) => {
  try {
    const emergencias = await Emergencia.find({
      estado: { $ne: 'cerrado' },
    })
      .populate('unidadAsignada', 'nombre tipo estado ultimaUbicacion')
      .populate('operadorId', 'nombre')
      .sort({ tiempoReporte: -1 })
    res.json(emergencias)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener emergencias activas' })
  }
}

// ── GET /api/emergencias/:id ───────────────────────────────────────────────────
export const obtener = async (req, res) => {
  try {
    const emergencia = await Emergencia.findById(req.params.id)
      .populate('unidadAsignada', 'nombre tipo estado responsable ultimaUbicacion')
      .populate('operadorId', 'nombre email')
      .populate('catalogoIncidente', 'nombre protocolo_coe tiempoRespuestaObjetivo')
      .populate('dependenciasApoyo', 'nombreCorto nombreOficial iconoSugerido')

    if (!emergencia) {
      return res.status(404).json({ mensaje: 'Emergencia no encontrada' })
    }
    res.json(emergencia)
  } catch (error) {
    res.status(500).json({ mensaje: 'Error al obtener emergencia' })
  }
}

// ── POST /api/emergencias ──────────────────────────────────────────────────────
export const crear = async (req, res) => {
  try {
    const {
      tipo,
      subtipo,
      catalogoIncidente,
      ubicacion,
      prioridad,
      personas,
      animales,
      notas,
      telefonoContacto,
      nombreContacto,
      dependenciasApoyo,
    } = req.body

    if (!tipo || !prioridad || !ubicacion || !ubicacion.colonia || !ubicacion.calle) {
      return res.status(400).json({
        mensaje: 'Faltan campos requeridos: tipo, prioridad, colonia/zona y calle de ubicación',
      })
    }

    const emergencia = await Emergencia.create({
      tipo,
      subtipo: subtipo || '',
      catalogoIncidente: catalogoIncidente || null,
      ubicacion: {
        calle: ubicacion.calle || '',
        numeroExterior: ubicacion.numeroExterior || '',
        numeroInterior: ubicacion.numeroInterior || '',
        colonia: ubicacion.colonia || '',
        referencias: ubicacion.referencias || '',
        lat: ubicacion.lat || null,
        lng: ubicacion.lng || null,
        direccionCompleta: ubicacion.direccionCompleta || ''
      },
      prioridad,
      personas: personas || 0,
      animales: animales || 0,
      notas: notas || '',
      telefonoContacto: telefonoContacto || '',
      nombreContacto: nombreContacto || '',
      dependenciasApoyo: dependenciasApoyo || [],
      operadorId: req.usuario._id,
      tiempoReporte: new Date(),
    })

    // Popular para devolver datos completos al frontend
    await emergencia.populate([
      { path: 'operadorId', select: 'nombre' },
      { path: 'catalogoIncidente', select: 'nombre' }
    ])

    // Disparar mensaje inicial de creación a Telegram
    enviarNuevoIncidente(emergencia).catch(console.error)

    // Emitir evento Socket.io para que el mapa se actualice en tiempo real
    if (req.io) {
      req.io.emit('emergencia:nueva', emergencia)
    }

    res.status(201).json(emergencia)
  } catch (error) {
    console.error('Error al crear emergencia:', error)
    res.status(500).json({ mensaje: 'Error al crear emergencia' })
  }
}

// ── PUT /api/emergencias/:id ───────────────────────────────────────────────────
export const actualizar = async (req, res) => {
  try {
    const {
      tipo, subtipo, ubicacion,
      prioridad, personas, animales, notas,
      telefonoContacto, nombreContacto, dependenciasApoyo,
    } = req.body

    const emergencia = await Emergencia.findById(req.params.id)
    if (!emergencia) return res.status(404).json({ mensaje: 'Emergencia no encontrada' })
    if (emergencia.estado === 'cerrado') {
      return res.status(400).json({ mensaje: 'No se puede editar una emergencia cerrada' })
    }

    Object.assign(emergencia, {
      tipo: tipo ?? emergencia.tipo,
      subtipo: subtipo ?? emergencia.subtipo,
      ubicacion: ubicacion ? {
        calle: ubicacion.calle ?? emergencia.ubicacion.calle,
        numeroExterior: ubicacion.numeroExterior ?? emergencia.ubicacion.numeroExterior,
        numeroInterior: ubicacion.numeroInterior ?? emergencia.ubicacion.numeroInterior,
        colonia: ubicacion.colonia ?? emergencia.ubicacion.colonia,
        referencias: ubicacion.referencias ?? emergencia.ubicacion.referencias,
        lat: ubicacion.lat ?? emergencia.ubicacion.lat,
        lng: ubicacion.lng ?? emergencia.ubicacion.lng,
        direccionCompleta: ubicacion.direccionCompleta ?? emergencia.ubicacion.direccionCompleta
      } : emergencia.ubicacion,
      prioridad: prioridad ?? emergencia.prioridad,
      personas: personas ?? emergencia.personas,
      animales: animales ?? emergencia.animales,
      notas: notas ?? emergencia.notas,
      telefonoContacto: telefonoContacto ?? emergencia.telefonoContacto,
      nombreContacto: nombreContacto ?? emergencia.nombreContacto,
      dependenciasApoyo: dependenciasApoyo ?? emergencia.dependenciasApoyo,
    })

    await emergencia.save()
    await emergencia.populate('unidadAsignada', 'nombre tipo estado')

    if (req.io) {
      req.io.emit('emergencia:actualizada', emergencia)
    }

    res.json(emergencia)
  } catch (error) {
    console.error('Error al actualizar emergencia:', error)
    res.status(500).json({ mensaje: 'Error al actualizar emergencia' })
  }
}

// ── PATCH /api/emergencias/:id/asignar ────────────────────────────────────────
// Asigna una unidad y cambia estado a 'asignado'
export const asignarUnidad = async (req, res) => {
  try {
    const { unidadId } = req.body
    if (!unidadId) return res.status(400).json({ mensaje: 'unidadId es requerido' })

    const [emergencia, unidad] = await Promise.all([
      Emergencia.findById(req.params.id),
      Unidad.findById(unidadId),
    ])

    if (!emergencia) return res.status(404).json({ mensaje: 'Emergencia no encontrada' })
    if (!unidad) return res.status(404).json({ mensaje: 'Unidad no encontrada' })
    if (emergencia.estado === 'cerrado') {
      return res.status(400).json({ mensaje: 'La emergencia está cerrada' })
    }

    emergencia.unidadAsignada = unidadId
    emergencia.estado = 'asignado'
    emergencia.tiempoAsignacion = new Date()
    await emergencia.save()

    unidad.estado = 'en_camino'
    await unidad.save()

    await emergencia.populate([
      { path: 'unidadAsignada', select: 'nombre tipo estado responsable' },
      { path: 'catalogoIncidente', select: 'nombre' },
      { path: 'dependenciasApoyo', select: 'nombreCorto' }
    ])

    // Disparar Telegram en segundo plano
    enviarDespacho(emergencia, unidad, req.usuario?.nombre).catch(console.error)

    if (req.io) {
      req.io.emit('emergencia:actualizada', emergencia)
      req.io.emit('unidad:estado', { unidadId, estado: 'en_camino' })
    }

    res.json(emergencia)
  } catch (error) {
    console.error('Error al asignar unidad:', error)
    res.status(500).json({ mensaje: 'Error al asignar unidad' })
  }
}

// ── PATCH /api/emergencias/:id/estado ─────────────────────────────────────────
export const cambiarEstado = async (req, res) => {
  try {
    const { estado } = req.body
    const estadosValidos = ['nuevo', 'asignado', 'en_atencion', 'cerrado']
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ mensaje: 'Estado inválido' })
    }

    const emergencia = await Emergencia.findById(req.params.id)
    if (!emergencia) return res.status(404).json({ mensaje: 'Emergencia no encontrada' })

    const ahora = new Date()
    emergencia.estado = estado

    // ── Timestamps y efectos de negocio por estado ─────────────────────────
    if (estado === 'en_atencion') {
      // La unidad llegó a escena → registrar el momento exacto para calcular TPR
      if (!emergencia.tiempoEscena) {
        emergencia.tiempoEscena = ahora
      }
    }

    if (estado === 'cerrado') {
      emergencia.tiempoCierre = ahora
      // Liberar unidad asignada → disponible de nuevo
      if (emergencia.unidadAsignada) {
        await Unidad.findByIdAndUpdate(emergencia.unidadAsignada, { estado: 'disponible' })
        if (req.io) {
          req.io.emit('unidad:estado', { unidadId: emergencia.unidadAsignada.toString(), estado: 'disponible' })
        }
      }
    }

    await emergencia.save()
    
    await emergencia.populate([
      { path: 'unidadAsignada', select: 'nombre tipo estado responsable' },
      { path: 'catalogoIncidente', select: 'nombre' },
      { path: 'dependenciasApoyo', select: 'nombreCorto' }
    ])

    // Disparar mensaje a Telegram con la actualización de estado de la emergencia
    if (emergencia.unidadAsignada) {
      enviarActualizacionTelegram(emergencia, emergencia.unidadAsignada, null, req.usuario?.nombre).catch(console.error)
    }

    if (req.io) {
      req.io.emit('emergencia:actualizada', emergencia)
    }

    res.json(emergencia)
  } catch (error) {
    console.error('Error al cambiar estado:', error)
    res.status(500).json({ mensaje: 'Error al cambiar estado' })
  }
}

// ── PATCH /api/emergencias/:id/aceptar ─────────────────────────────────────────
// Unidad en campo acepta el servicio: registra tiempoAceptacion y cambia estado a en_atencion
export const aceptarEmergencia = async (req, res) => {
  try {
    const emergencia = await Emergencia.findById(req.params.id)
    if (!emergencia) return res.status(404).json({ mensaje: 'Emergencia no encontrada' })

    const ahora = new Date()
    if (!emergencia.tiempoAceptacion) {
      emergencia.tiempoAceptacion = ahora
    }
    if (emergencia.estado === 'nuevo' || emergencia.estado === 'asignado') {
      emergencia.estado = 'en_atencion'
    }

    if (emergencia.unidadAsignada) {
      await Unidad.findByIdAndUpdate(emergencia.unidadAsignada, { estado: 'en_camino' })
      if (req.io) {
        req.io.emit('unidad:estado', { unidadId: emergencia.unidadAsignada.toString(), estado: 'en_camino' })
      }
    }

    await emergencia.save()
    await emergencia.populate([
      { path: 'unidadAsignada', select: 'nombre tipo estado responsable' },
      { path: 'catalogoIncidente', select: 'nombre' },
      { path: 'dependenciasApoyo', select: 'nombreCorto' }
    ])

    if (req.io) {
      req.io.emit('emergencia:actualizada', emergencia)
    }

    if (emergencia.unidadAsignada) {
      enviarActualizacionTelegram(emergencia, emergencia.unidadAsignada, null, req.usuario?.nombre, 'CAMPO').catch(console.error)
    }

    res.json(emergencia)
  } catch (error) {
    console.error('Error al aceptar emergencia:', error)
    res.status(500).json({ mensaje: 'Error al aceptar emergencia' })
  }
}

// Guardar el formulario dinámico de campo (FO-DO-03)
export const guardarReporteCampo = async (req, res) => {
  try {
    const { finalizar, ...datosReporte } = req.body

    const emergencia = await Emergencia.findById(req.params.id)
    if (!emergencia) return res.status(404).json({ mensaje: 'Emergencia no encontrada' })

    const ahora = new Date()
    if (!emergencia.tiempoEscena) {
      emergencia.tiempoEscena = ahora
    }

    // Sobreescribir o combinar los campos del reporte de campo
    emergencia.reporteCampo = {
      ...(emergencia.reporteCampo?.toObject ? emergencia.reporteCampo.toObject() : emergencia.reporteCampo || {}),
      ...datosReporte
    }

    if (finalizar) {
      emergencia.estado = 'cerrado'
      emergencia.tiempoCierre = ahora
      if (emergencia.unidadAsignada) {
        await Unidad.findByIdAndUpdate(emergencia.unidadAsignada, { estado: 'disponible' })
        if (req.io) {
          req.io.emit('unidad:estado', { unidadId: emergencia.unidadAsignada.toString(), estado: 'disponible' })
        }
      }
    }

    await emergencia.save()
    await emergencia.populate([
      { path: 'unidadAsignada', select: 'nombre tipo estado responsable' },
      { path: 'catalogoIncidente', select: 'nombre' },
      { path: 'dependenciasApoyo', select: 'nombreCorto' }
    ])

    if (finalizar && emergencia.unidadAsignada) {
      enviarActualizacionTelegram(emergencia, emergencia.unidadAsignada, null, req.usuario?.nombre, 'CAMPO').catch(console.error)
    }

    if (req.io) {
      req.io.emit('emergencia:actualizada', emergencia)
    }

    res.json(emergencia)
  } catch (error) {
    console.error('Error al guardar reporte de campo:', error)
    res.status(500).json({ mensaje: 'Error al guardar reporte de campo' })
  }
}


// ── GET /api/emergencias/stats ────────────────────────────────────────────────
export const obtenerEstadisticas = async (req, res) => {
  try {
    const ahora = new Date()
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate())
    const inicioAyer = new Date(inicioHoy.getTime() - 24 * 60 * 60 * 1000)
    
    // Función auxiliar para obtener el Lunes de esta semana
    const getInicioSemana = (d) => {
      d = new Date(d)
      var day = d.getDay(), diff = d.getDate() - day + (day == 0 ? -6 : 1)
      return new Date(d.setDate(diff))
    }
    const inicioSemana = getInicioSemana(inicioHoy)
    inicioSemana.setHours(0,0,0,0)

    // === 1. Tiempos Promedio de Despacho (Hoy vs Ayer) ===
    const calcTiempo = (matchQuery) => {
      return Emergencia.aggregate([
        { $match: { ...matchQuery, tiempoAsignacion: { $ne: null }, tiempoReporte: { $ne: null } } },
        {
          $project: {
            tiempo: { $divide: [{ $subtract: ['$tiempoAsignacion', '$tiempoReporte'] }, 60000] }
          }
        },
        { $group: { _id: null, promedio: { $avg: '$tiempo' } } }
      ])
    }
    
    const tiempoHoyRes = await calcTiempo({ tiempoReporte: { $gte: inicioHoy } })
    const tiempoAyerRes = await calcTiempo({ tiempoReporte: { $gte: inicioAyer, $lt: inicioHoy } })
    
    // Si no hay datos de hoy, tomamos el global
    let tiempoPromedioGlobal = 0
    if (tiempoHoyRes.length === 0) {
      const tiempoGlobalRes = await calcTiempo({})
      tiempoPromedioGlobal = tiempoGlobalRes.length > 0 ? tiempoGlobalRes[0].promedio : 0
    } else {
      tiempoPromedioGlobal = tiempoHoyRes[0].promedio
    }

    const tiempoHoy = tiempoHoyRes.length > 0 ? tiempoHoyRes[0].promedio : tiempoPromedioGlobal
    const tiempoAyer = tiempoAyerRes.length > 0 ? tiempoAyerRes[0].promedio : tiempoHoy
    
    let tiempoDespachoTrend = 0
    if (tiempoAyer > 0) {
      tiempoDespachoTrend = ((tiempoHoy - tiempoAyer) / tiempoAyer) * 100
    }

    // === 1b. Tiempos Promedio de Respuesta Real (TPR) (Hoy vs Ayer) ===
    const calcTiempoRespuesta = (matchQuery) => {
      return Emergencia.aggregate([
        { $match: { ...matchQuery, tiempoEscena: { $ne: null }, tiempoReporte: { $ne: null } } },
        {
          $project: {
            tiempo: { $divide: [{ $subtract: ['$tiempoEscena', '$tiempoReporte'] }, 60000] }
          }
        },
        { $group: { _id: null, promedio: { $avg: '$tiempo' } } }
      ])
    }

    const tprHoyRes = await calcTiempoRespuesta({ tiempoReporte: { $gte: inicioHoy } })
    const tprAyerRes = await calcTiempoRespuesta({ tiempoReporte: { $gte: inicioAyer, $lt: inicioHoy } })

    let tprPromedioGlobal = 0
    if (tprHoyRes.length === 0) {
      const tprGlobalRes = await calcTiempoRespuesta({})
      tprPromedioGlobal = tprGlobalRes.length > 0 ? tprGlobalRes[0].promedio : 0
    } else {
      tprPromedioGlobal = tprHoyRes[0].promedio
    }

    const tprHoy = tprHoyRes.length > 0 ? tprHoyRes[0].promedio : tprPromedioGlobal
    const tprAyer = tprAyerRes.length > 0 ? tprAyerRes[0].promedio : tprHoy

    let tprTrend = 0
    if (tprAyer > 0) {
      tprTrend = ((tprHoy - tprAyer) / tprAyer) * 100
    }

    // === 2. Emergencias Hoy (Hoy vs Ayer) ===
    const emergenciasHoyCount = await Emergencia.countDocuments({ tiempoReporte: { $gte: inicioHoy } })
    const emergenciasAyerCount = await Emergencia.countDocuments({ tiempoReporte: { $gte: inicioAyer, $lt: inicioHoy } })
    
    let emergenciasTrend = 0
    if (emergenciasAyerCount > 0) {
      emergenciasTrend = ((emergenciasHoyCount - emergenciasAyerCount) / emergenciasAyerCount) * 100
    }

    // === 3. Disponibilidad de Flota ===
    const totalUnidades = await Unidad.countDocuments()
    const unidadesDisponibles = await Unidad.countDocuments({ estado: 'disponible' })
    const disponibilidadFlotaPorcentaje = totalUnidades > 0 ? (unidadesDisponibles / totalUnidades) * 100 : 0
    const flota = {
      total: totalUnidades,
      disponibles: unidadesDisponibles,
      porcentaje: disponibilidadFlotaPorcentaje
    }

    // === 4. Tasa de Cierre ===
    const totalesHoy = await Emergencia.countDocuments({})
    const cerradasHoy = await Emergencia.countDocuments({ estado: 'cerrado' })
    const tasaCierre = totalesHoy > 0 ? (cerradasHoy / totalesHoy) * 100 : 0

    // === 5. Incidentes por Tipo ===
    const porTipo = await Emergencia.aggregate([
      { $group: { _id: '$tipo', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ])

    // === 6. Incidentes por Día (Semana actual) ===
    const incidentesSemana = await Emergencia.aggregate([
      { $match: { tiempoReporte: { $gte: inicioSemana } } },
      { 
        $group: { 
          _id: { $dayOfWeek: "$tiempoReporte" }, // 1 (Sunday) to 7 (Saturday)
          count: { $sum: 1 } 
        } 
      }
    ])
    
    const diasNombres = ['DOM', 'LUN', 'MAR', 'MIE', 'JUE', 'VIE', 'SAB']
    const incidentesPorDia = diasNombres.map((name, i) => {
      const match = incidentesSemana.find(s => s._id === i + 1)
      return { dia: name, count: match ? match.count : 0 }
    })
    // Rotar para que empiece en LUN
    const dom = incidentesPorDia.shift()
    incidentesPorDia.push(dom)

    // === 7. Carga de Trabajo por Unidad ===
    // Obtenemos todas las unidades
    const unidades = await Unidad.find({}, 'nombre tipo estado')
    
    // Agrupamos emergencias de HOY por unidad asignada
    const emergenciasUnidadHoy = await Emergencia.aggregate([
      { $match: { unidadAsignada: { $ne: null }, tiempoAsignacion: { $gte: inicioHoy } } },
      {
        $group: {
          _id: '$unidadAsignada',
          servicios: { $sum: 1 },
          tiempoActivoMs: {
            $sum: {
              $cond: [
                { $ne: ['$tiempoCierre', null] },
                { $subtract: ['$tiempoCierre', '$tiempoAsignacion'] },
                { $subtract: [new Date(), '$tiempoAsignacion'] }
              ]
            }
          }
        }
      }
    ])

    const cargaTrabajoUnidades = unidades.map(u => {
      const datos = emergenciasUnidadHoy.find(e => e._id.toString() === u._id.toString()) || { servicios: 0, tiempoActivoMs: 0 }
      const horas = Math.floor(datos.tiempoActivoMs / (1000 * 60 * 60))
      const minutos = Math.floor((datos.tiempoActivoMs % (1000 * 60 * 60)) / (1000 * 60))
      const tiempoActivoStr = `${horas.toString().padStart(2, '0')}h ${minutos.toString().padStart(2, '0')}m`
      
      return {
        idUnidad: u.nombre,
        tipo: u.tipo,
        serviciosHoy: datos.servicios,
        tiempoActivo: tiempoActivoStr,
        estado: u.estado
      }
    }).sort((a, b) => b.serviciosHoy - a.serviciosHoy)

    res.json({
      tacticos: {
        tiempoDespacho: tiempoHoy,
        tiempoDespachoTrend,
        tiempoRespuesta: tprHoy,
        tiempoRespuestaTrend: tprTrend,
        emergenciasHoy: emergenciasHoyCount,
        emergenciasTrend,
        flota,
        tasaCierre
      },
      porTipo,
      incidentesPorDia,
      cargaTrabajoUnidades
    })
  } catch (error) {
    console.error('Error al obtener estadísticas:', error)
    res.status(500).json({ mensaje: 'Error al obtener estadísticas' })
  }
}
