const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
  const sqlPath = path.resolve(__dirname, '../../sql/vistas_es.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');

  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: 'postgres',
    database: 'sistema2026',
  });

  await client.connect();
  await client.query(sql);

  const result = await client.query(
    "SELECT table_name FROM information_schema.views WHERE table_schema='public' AND table_name LIKE 'vw_%' ORDER BY table_name",
  );

  console.log(
    'Vistas creadas:',
    result.rows.map((row) => row.table_name).join(', '),
  );

  await client.end();
}

main().catch((error) => {
  console.error('Error aplicando vistas en español:', error.message);
  process.exit(1);
});

