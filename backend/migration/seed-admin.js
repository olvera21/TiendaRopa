/**
 * Crea (o actualiza la contraseña de) el usuario administrador inicial.
 * Uso:
 *   node migration/seed-admin.js "Admin" "admin@tienda.com" "MiPassword123!"
 */
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sql, getPool } = require('../src/config/db');

async function main() {
  const [, , nombre = 'Administrador', email = 'admin@tienda.com', password = 'Admin123!'] = process.argv;

  const pool = await getPool();
  const hash = await bcrypt.hash(password, 10);

  const existe = await pool.request().input('email', sql.NVarChar, email).query('SELECT id FROM usuarios WHERE email=@email');

  if (existe.recordset.length) {
    await pool
      .request()
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hash)
      .query("UPDATE usuarios SET password=@password, rol='admin', activo=1 WHERE email=@email");
    console.log(`✅ Contraseña actualizada para ${email}`);
  } else {
    await pool
      .request()
      .input('nombre', sql.NVarChar, nombre)
      .input('email', sql.NVarChar, email)
      .input('password', sql.NVarChar, hash)
      .query("INSERT INTO usuarios (nombre,email,password,rol,activo) VALUES (@nombre,@email,@password,'admin',1)");
    console.log(`✅ Usuario admin creado: ${email}`);
  }

  console.log(`   Contraseña: ${password}  (cámbiala después de iniciar sesión)`);
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error creando admin:', err.message);
  process.exit(1);
});
