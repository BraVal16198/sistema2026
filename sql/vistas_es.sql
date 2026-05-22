-- Vistas en español para consulta en pgAdmin
-- Ejecutar sobre la base de datos: sistema2026

CREATE OR REPLACE VIEW vw_usuarios AS
SELECT
  id AS id_usuario,
  username AS usuario,
  role AS rol,
  "isActive" AS activo
FROM users;

CREATE OR REPLACE VIEW vw_pacientes AS
SELECT
  p.id AS id_paciente,
  p.dni AS dni,
  p."fullName" AS nombre_completo,
  p."firstName" AS nombres,
  p."paternalLastName" AS apellido_paterno,
  p."maternalLastName" AS apellido_materno,
  p.phone AS telefono,
  p."birthDate" AS fecha_nacimiento
FROM patient_profiles p;

CREATE OR REPLACE VIEW vw_citas AS
SELECT
  a.id AS id_cita,
  p."fullName" AS paciente,
  p.dni AS dni,
  a.doctor AS medico,
  a.date AS fecha,
  a.time AS hora,
  a.reason AS motivo,
  a.status AS estado,
  a.specialty AS especialidad,
  a."createdAt" AS fecha_creacion
FROM appointments a
LEFT JOIN patient_profiles p ON p.id = a."patientProfileId";

CREATE OR REPLACE VIEW vw_pagos AS
SELECT
  py.id AS id_pago,
  p."fullName" AS paciente,
  p.dni AS dni,
  py.invoice AS comprobante,
  py.amount AS monto,
  py.method AS metodo_pago,
  py.status AS estado,
  py."appointmentId" AS id_cita,
  py."createdAt" AS fecha_creacion
FROM payments py
LEFT JOIN patient_profiles p ON p.id = py."patientProfileId";

CREATE OR REPLACE VIEW vw_historial_clinico AS
SELECT
  h.id AS id_historial,
  p.dni AS dni,
  p."fullName" AS paciente,
  h.date AS fecha,
  h.doctor AS medico,
  h.specialty AS especialidad,
  h.motivo AS motivo,
  h.diagnostico AS diagnostico,
  h.tratamiento AS tratamiento,
  h.examenes AS examenes,
  h.observaciones AS observaciones,
  h."createdAt" AS fecha_creacion
FROM history_entries h
LEFT JOIN patient_profiles p ON p.id = h."patientProfileId";

