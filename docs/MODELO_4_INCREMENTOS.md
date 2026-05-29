# Modelo incremental — Sistema2026

Repositorio: https://github.com/BraVal16198/sistema2026

## Incremento 1 — Registro y consulta de pacientes

| Funcionalidad | Módulo | API |
|---------------|--------|-----|
| Login por rol | Login | `POST /auth/login` |
| Registro paciente | Login | `POST /auth/paciente/register` |
| Recuperar usuario por DNI | Login | `POST /auth/paciente/recover` |
| Ver perfil, citas, pagos e historial | Paciente | `GET /patient/portal/:username/state` |

## Incremento 2 — Programación de citas

| Funcionalidad | Módulo | API |
|---------------|--------|-----|
| Agendar cita (paciente) | Paciente | `POST /patient/portal/:username/citas` |
| Crear cita por DNI | Caja / Admin | `POST /patient/caja|admin/citas/by-dni/:dni` |
| Agenda médica del día | Médico | `GET /patient/medico/overview` |
| Actualizar estado de cita | Médico / Admin | `POST /patient/appointments/:id/update` |

## Incremento 3 — Pagos y facturación

| Funcionalidad | Módulo | API |
|---------------|--------|-----|
| Pagar desde portal | Paciente | `POST /patient/portal/:username/pagos/:id/pagar` |
| Cobrar en caja | Caja | `POST /patient/caja/pagos/:id/pagar` |
| Resumen del día | Caja | `GET /patient/caja/overview` |
| Cierre de caja (persistido local por fecha) | Caja | UI + `localStorage` |

## Incremento 4 — Historia clínica y cierre del sistema

| Funcionalidad | Módulo | API |
|---------------|--------|-----|
| Registrar historia clínica | Médico | `POST /patient/history/by-dni/:dni` |
| Panel administrador | Admin | `GET /patient/admin/overview` |
| Exportar PDF | Paciente, Caja, Admin | jsPDF en frontend |
| Catálogo unificado (médicos, horarios, pagos) | Todos | `GET /patient/catalog` |
| Vistas SQL (pgAdmin) | BD | `sql/vistas_es.sql` |

## Flujo sincronizado recomendado

1. **Paciente** se registra e inicia sesión → portal con datos del API.
2. **Caja/Admin** crea cita por DNI → pago pendiente en BD.
3. **Caja** registra pago → cita pasa a **Confirmada**.
4. **Médico** atiende (agenda del día actual) → guarda historia → marca **Completada**.
5. **Admin** revisa overview y reportes PDF.

## Cuentas de prueba

| Rol | Usuario | Contraseña |
|-----|---------|------------|
| Paciente | paciente1 | paciente1 |
| Médico | medico | medico |
| Caja | caja | caja |
| Admin | administrador | administrador |
