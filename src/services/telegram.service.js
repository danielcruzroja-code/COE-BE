// ── telegram.service.js ─────────────────────────────────────────────────────
// Servicio de notificaciones a Telegram para el COE Zapopan.
// Envía mensajes formateados al grupo operativo en cada fase del incidente.
// ─────────────────────────────────────────────────────────────────────────────

// ── Helpers de formato ──────────────────────────────────────────────────────
const formatFecha = (date) => {
  if (!date) return '--'
  const d = new Date(date)
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

const formatHora = (date) => {
  if (!date) return '--:--'
  const d = new Date(date)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
}

const prioridadLabel = {
  baja: '🟢 BAJA',
  media: '🟡 MEDIA',
  alta: '🟠 ALTA',
  critica: '🔴 CRÍTICA'
}

const construirUbicacion = (ubicacion) => {
  if (!ubicacion) return 'Sin ubicación registrada'
  const calle = ubicacion.calle || ''
  const ext = ubicacion.numeroExterior ? ` #${ubicacion.numeroExterior}` : ''
  const int = ubicacion.numeroInterior ? ` Int. ${ubicacion.numeroInterior}` : ''
  const col = ubicacion.colonia ? `Col. ${ubicacion.colonia}` : ''
  const refs = ubicacion.referencias ? `Ref: ${ubicacion.referencias}` : ''

  let texto = `${calle}${ext}${int}`
  if (col) texto += `\n   ${col}`
  if (refs) texto += `\n   ${refs}`
  return texto
}

const construirGoogleMapsUrl = (ubicacion) => {
  if (!ubicacion?.lat || !ubicacion?.lng) return ''
  return `https://www.google.com/maps?q=${ubicacion.lat},${ubicacion.lng}`
}

// ── Enviar Mensaje a Telegram ───────────────────────────────────────────────
const enviarMensaje = async (texto) => {
  const token = process.env.TELEGRAM_BOT_TOKEN
  const chatId = process.env.TELEGRAM_CHAT_ID

  if (!token || !chatId) {
    console.warn('⚠️ Credenciales de Telegram no configuradas. Saltando envío.')
    return
  }

  const url = `https://api.telegram.org/bot${token}/sendMessage`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: texto,
        parse_mode: 'HTML',
        disable_web_page_preview: true,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('❌ Error de Telegram API:', errorData)
    } else {
      console.log('✅ Mensaje de Telegram enviado correctamente.')
    }
  } catch (error) {
    console.error('❌ Excepción al enviar mensaje a Telegram:', error)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 1. NUEVO INCIDENTE REGISTRADO
// ═══════════════════════════════════════════════════════════════════════════════
export const enviarNuevoIncidente = async (emergencia) => {
  const folio = emergencia.folio || 'Sin folio'
  const fecha = formatFecha(emergencia.tiempoReporte)
  const hora = formatHora(emergencia.tiempoReporte)
  const tipo = emergencia.catalogoIncidente?.nombre || emergencia.subtipo || emergencia.tipo || 'INCIDENTE'
  const prioridad = prioridadLabel[emergencia.prioridad] || emergencia.prioridad
  const ubicacion = construirUbicacion(emergencia.ubicacion)
  const mapsUrl = construirGoogleMapsUrl(emergencia.ubicacion)
  const notas = emergencia.notas || 'Sin observaciones.'
  const contacto = emergencia.nombreContacto || 'No proporcionado'
  const telefono = emergencia.telefonoContacto || 'No proporcionado'
  const personas = emergencia.personas || 0
  const animales = emergencia.animales || 0
  const operador = emergencia.operadorId?.nombre || 'Sistema'

  let mensaje = `🏢 <b>[ COE ZAPOPAN - CABINA ]</b>
🚨 <b>NUEVO INCIDENTE REGISTRADO</b> 🚨
━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>Folio:</b> ${folio}
📅 <b>Fecha:</b> ${fecha}
🕐 <b>Hora de reporte:</b> ${hora}

🔥 <b>Tipo:</b> ${tipo}
⚡ <b>Prioridad:</b> ${prioridad}

📍 <b>UBICACIÓN:</b>
   ${ubicacion}`

  if (mapsUrl) {
    mensaje += `\n   📌 <a href="${mapsUrl}">Ver en Google Maps</a>`
  }

  mensaje += `

📝 <b>SITUACIÓN REPORTADA:</b>
${notas}

👤 <b>DATOS DEL REPORTANTE:</b>
   Nombre: ${contacto}
   Teléfono: ${telefono}`

  if (personas > 0 || animales > 0) {
    mensaje += `\n\n👥 <b>INVOLUCRADOS:</b>`
    if (personas > 0) mensaje += `\n   Personas: ${personas}`
    if (animales > 0) mensaje += `\n   Animales: ${animales}`
  }

  mensaje += `

📡 <b>Registrado por:</b> ${operador}
⏳ <b>Estado:</b> PENDIENTE DE ASIGNAR UNIDAD
━━━━━━━━━━━━━━━━━━━━━━━
<i>COE Zapopan — Protección Civil y Bomberos</i>`

  await enviarMensaje(mensaje)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. DESPACHO DE UNIDAD (Asignación)
// ═══════════════════════════════════════════════════════════════════════════════
export const enviarDespacho = async (emergencia, unidad, operador = 'Sistema') => {
  const folio = emergencia.folio || 'Sin folio'
  const fecha = formatFecha(emergencia.tiempoReporte)
  const horaReporte = formatHora(emergencia.tiempoReporte)
  const horaDespacho = formatHora(emergencia.tiempoAsignacion || new Date())
  const tipo = emergencia.catalogoIncidente?.nombre || emergencia.subtipo || emergencia.tipo || 'INCIDENTE'
  const prioridad = prioridadLabel[emergencia.prioridad] || emergencia.prioridad
  const ubicacion = construirUbicacion(emergencia.ubicacion)
  const mapsUrl = construirGoogleMapsUrl(emergencia.ubicacion)
  const notas = emergencia.notas || 'Sin observaciones.'

  const nombreUnidad = unidad?.nombre || 'Unidad asignada'
  const tipoUnidad = unidad?.tipo || ''
  const responsable = unidad?.responsable || ''

  let recursos = nombreUnidad
  if (emergencia.dependenciasApoyo && emergencia.dependenciasApoyo.length > 0) {
    const deps = emergencia.dependenciasApoyo.map(d => d.nombreCorto || d.nombre || 'Apoyo').join(', ')
    recursos += `\n   Apoyo: ${deps}`
  }

  let mensaje = `🏢 <b>[ COE ZAPOPAN - CABINA ]</b>
🟡 <b>DESPACHO DE UNIDAD</b>
━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>Folio:</b> ${folio}
📅 <b>Fecha:</b> ${fecha}
🕐 <b>Hora de reporte:</b> ${horaReporte}
🕑 <b>Hora de despacho:</b> ${horaDespacho}

🔥 <b>Tipo:</b> ${tipo}
⚡ <b>Prioridad:</b> ${prioridad}

📍 <b>UBICACIÓN:</b>
   ${ubicacion}`

  if (mapsUrl) {
    mensaje += `\n   📌 <a href="${mapsUrl}">Ver en Google Maps</a>`
  }

  mensaje += `

📝 <b>SITUACIÓN:</b>
${notas}

🚒 <b>RECURSO DESPACHADO:</b>
   Unidad: ${nombreUnidad}`
  if (tipoUnidad) mensaje += `\n   Tipo: ${tipoUnidad}`
  if (responsable) mensaje += `\n   Responsable: ${responsable}`
  if (recursos !== nombreUnidad) mensaje += `\n   ${recursos.split('\n').slice(1).join('\n   ')}`

  mensaje += `

⏳ <b>Estado:</b> UNIDAD EN CAMINO
📡 <b>Despachado por:</b> ${operador}
━━━━━━━━━━━━━━━━━━━━━━━
<i>COE Zapopan — Protección Civil y Bomberos</i>`

  await enviarMensaje(mensaje)
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. ACTUALIZACIÓN DE ESTADO (en_atencion, cerrado, etc.)
// ═══════════════════════════════════════════════════════════════════════════════
export const enviarActualizacionTelegram = async (emergencia, unidad, estadoOverride = null, operador = 'Sistema', fuente = 'COE') => {
  const estado = estadoOverride || emergencia.estado

  // Si es nuevo, usar el formato de nuevo incidente
  if (estado === 'nuevo') {
    return enviarNuevoIncidente(emergencia)
  }

  // Si es asignado, usar el formato de despacho
  if (estado === 'asignado') {
    return enviarDespacho(emergencia, unidad, operador)
  }

  // Para en_atencion y cerrado, usar formato de actualización
  const folio = emergencia.folio || 'Sin folio'
  const fecha = formatFecha(emergencia.tiempoReporte)
  const horaReporte = formatHora(emergencia.tiempoReporte)
  const tipo = emergencia.catalogoIncidente?.nombre || emergencia.subtipo || emergencia.tipo || 'INCIDENTE'
  const prioridad = prioridadLabel[emergencia.prioridad] || emergencia.prioridad
  const ubicacion = construirUbicacion(emergencia.ubicacion)
  const nombreUnidad = unidad?.nombre || emergencia.unidadAsignada?.nombre || 'Unidad asignada'

  let emoji = '🔵'
  let estadoTexto = estado.toUpperCase()
  let accion = ''

  if (estado === 'en_atencion') {
    emoji = '🔴'
    estadoTexto = 'EN ESCENA'
    const horaEscena = formatHora(emergencia.tiempoEscena || new Date())
    accion = `La unidad <b>${nombreUnidad}</b> arribó al lugar a las ${horaEscena}.\nEstado: TRABAJANDO EN ESCENA.`
  } else if (estado === 'cerrado') {
    emoji = '🟢'
    estadoTexto = 'SERVICIO FINALIZADO'
    const horaCierre = formatHora(emergencia.tiempoCierre || new Date())
    accion = `Servicio finalizado y cerrado a las ${horaCierre}.\nUnidad <b>${nombreUnidad}</b> retorna a base / disponible.`

    // Agregar resumen de tiempos si están disponibles
    if (emergencia.tiempoReporte && emergencia.tiempoCierre) {
      const minutos = Math.round((new Date(emergencia.tiempoCierre) - new Date(emergencia.tiempoReporte)) / 60000)
      accion += `\n\n⏱ <b>Tiempo total de atención:</b> ${minutos} minutos`
    }
  }

  const headerFuente = fuente === 'CAMPO' ? '🚒 <b>[ UNIDAD EN CAMPO ]</b>' : '🏢 <b>[ COE ZAPOPAN - CABINA ]</b>'

  let mensaje = `${headerFuente}
${emoji} <b>ACTUALIZACIÓN: ${estadoTexto}</b>
━━━━━━━━━━━━━━━━━━━━━━━

📋 <b>Folio:</b> ${folio}
📅 <b>Fecha:</b> ${fecha}
🕐 <b>Hora de reporte:</b> ${horaReporte}

🔥 <b>Tipo:</b> ${tipo}
⚡ <b>Prioridad:</b> ${prioridad}

📍 <b>UBICACIÓN:</b>
   ${ubicacion}

🛡️ <b>ACCIONES:</b>
${accion}

🚒 <b>Unidad:</b> ${nombreUnidad}

📡 <b>Actualizado por:</b> ${operador}
━━━━━━━━━━━━━━━━━━━━━━━
<i>COE Zapopan — Protección Civil y Bomberos</i>`

  await enviarMensaje(mensaje)
}
