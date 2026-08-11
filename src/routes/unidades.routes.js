import { Router } from 'express'
import {
  listar,
  disponibles,
  obtener,
  crear,
  actualizar,
  actualizarEstado,
  eliminar,
} from '../controllers/unidades.controller.js'
import { verificarToken } from '../middleware/auth.middleware.js'
import { soloRoles } from '../middleware/roles.middleware.js'

const router = Router()

router.use(verificarToken)

// GET /api/unidades/disponibles  — debe ir ANTES de /:id
router.get('/disponibles', disponibles)

// GET    /api/unidades
router.get('/', listar)

// GET    /api/unidades/:id
router.get('/:id', obtener)

// POST   /api/unidades — solo admin
router.post('/', soloRoles('admin'), crear)

// PUT    /api/unidades/:id — solo admin
router.put('/:id', soloRoles('admin'), actualizar)

// PATCH  /api/unidades/:id/estado — campo, operador o admin
router.patch('/:id/estado', soloRoles('operador', 'admin', 'campo'), actualizarEstado)

// DELETE /api/unidades/:id — solo admin
router.delete('/:id', soloRoles('admin'), eliminar)

export default router
