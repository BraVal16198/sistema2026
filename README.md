# Sistema2026

Sistema de gestión clínica (frontend React + backend NestJS + PostgreSQL).

## Requisitos

- Node.js 20+
- PostgreSQL 16 (o Docker)

## Configuración

1. Copia las variables de entorno:
   - `backend/.env.example` → `backend/.env`
   - `frontend/.env.example` → `frontend/.env`

2. Base de datos (opción Docker):

```bash
docker compose up -d
```

Si usas Docker, en `backend/.env` usa `DB_PORT=5433`.

## Desarrollo

```bash
# Backend (puerto 3000)
cd backend
npm install
npm run start:dev

# Frontend (puerto 5173)
cd frontend
npm install
npm run dev
```

Abre http://localhost:5173/

## Cuentas de prueba

| Perfil | Usuario | Contraseña |
|--------|---------|------------|
| Administrador | administrador | administrador |
| Caja | caja | caja |
| Médico | medico | medico |
| Paciente | paciente1 | paciente1 |

## SQL

Vistas en `sql/vistas_es.sql`.
