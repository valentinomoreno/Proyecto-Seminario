import { randomUUID } from 'crypto';
import { performance } from 'perf_hooks';
import AppDataSource from '../database/data-source';

interface Resultado { escenario: string; solicitudes: number; concurrencia: number; p95Ms: number; maxMs: number }
const base = process.env.BENCHMARK_BASE_URL ?? 'http://localhost:3000';

async function main() {
  await AppDataSource.initialize();
  let idProducto: number | undefined;
  const ventas: number[] = [];
  const prefijo = `S5B${Date.now()}`;
  try {
    const login = await fetch(`${base}/auth/login`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: process.env.SEED_ADMIN_USERNAME ?? 'admin',
        contrasena: process.env.SEED_ADMIN_PASSWORD ?? 'Admin_Seguro.2026!',
      }),
    });
    if (!login.ok) throw new Error(`Login: HTTP ${login.status}`);
    const token = (await login.json() as { accessToken: string }).accessToken;
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    const [ref] = await AppDataSource.query<Array<{ id_categoria: number; id_marca: number; id_estante: number }>>(
      'SELECT id_categoria,id_marca,id_estante FROM productos LIMIT 1');
    const [cliente] = await AppDataSource.query<Array<{ id_cliente: number }>>(
      'SELECT id_cliente FROM clientes WHERE fecha_baja IS NULL LIMIT 1');
    if (!ref || !cliente) throw new Error('Se requieren datos seed para medir el POS.');
    const [producto] = await AppDataSource.query<Array<{ id_producto: number }>>(`
      INSERT INTO productos (sku,nombre,descripcion,stock,precio_unitario,id_categoria,id_marca,id_estante)
      VALUES ($1,'Benchmark Sprint 5','Temporal',30,100,$2,$3,$4) RETURNING id_producto`,
    [`BENCH-${randomUUID()}`, ref.id_categoria, ref.id_marca, ref.id_estante]);
    idProducto = producto.id_producto;
    await AppDataSource.query(`
      INSERT INTO productos (sku,nombre,descripcion,stock,precio_unitario,id_categoria,id_marca,id_estante)
      SELECT $1 || '-P' || g, 'Benchmark producto ' || g, 'Temporal', 100, 100,
        $2,$3,$4 FROM generate_series(1,1000) g`,
    [prefijo, ref.id_categoria, ref.id_marca, ref.id_estante]);
    await AppDataSource.query(`
      INSERT INTO ventas (numero_venta,fecha,subtotal,iva,total,modalidad_pago,estado,id_usuario,id_cliente)
      SELECT $1 || '-V' || g, now() - ((g % 365) || ' days')::interval,
        100,0,100,'CONTADO','COMPLETADA',
        (SELECT id_usuario FROM usuarios WHERE nombre=$2 LIMIT 1),$3
      FROM generate_series(1,5000) g`,
    [prefijo, process.env.SEED_ADMIN_USERNAME ?? 'admin', cliente.id_cliente]);
    await AppDataSource.query(`
      INSERT INTO facturas (id_venta,tipo_factura,numero_factura,subtotal,iva,total)
      SELECT id_venta,'FACTURA_B',$1 || '-F' || id_venta,100,0,100
      FROM ventas WHERE numero_venta LIKE $1 || '-V%'`, [prefijo]);
    await AppDataSource.query(`
      INSERT INTO cobros (id_venta,metodo_cobro,monto)
      SELECT id_venta,'EFECTIVO',100 FROM ventas WHERE numero_venta LIKE $1 || '-V%'`, [prefijo]);
    await AppDataSource.query(`
      WITH productos_temp AS (
        SELECT id_producto, row_number() OVER (ORDER BY id_producto) n
        FROM productos WHERE sku LIKE $1 || '-P%'
      )
      INSERT INTO detalles_venta (id_venta,id_producto,cantidad,precio_unitario,subtotal)
      SELECT v.id_venta,p.id_producto,1,100,100 FROM ventas v
      JOIN productos_temp p ON p.n = (v.id_venta % 1000) + 1
      WHERE v.numero_venta LIKE $1 || '-V%'`, [prefijo]);
    await AppDataSource.query('ANALYZE productos');
    await AppDataSource.query('ANALYZE ventas');
    await AppDataSource.query('ANALYZE detalles_venta');
    const [counts] = await AppDataSource.query<Array<{ productos: string; ventas: string; clientes: string }>>(
      'SELECT (SELECT count(*) FROM productos)::text productos, (SELECT count(*) FROM ventas)::text ventas, (SELECT count(*) FROM clientes)::text clientes');

    async function medir(escenario: string, cantidad: number, concurrencia: number,
      solicitud: () => Promise<Response>): Promise<Resultado> {
      const tiempos: number[] = [];
      for (let inicio = 0; inicio < cantidad; inicio += concurrencia) {
        await Promise.all(Array.from({ length: Math.min(concurrencia, cantidad - inicio) }, async () => {
          const t0 = performance.now();
          const respuesta = await solicitud();
          tiempos.push(performance.now() - t0);
          if (!respuesta.ok) throw new Error(`${escenario}: HTTP ${respuesta.status}`);
          if (escenario === 'POS registrar venta') {
            ventas.push((await respuesta.json() as { idVenta: number }).idVenta);
          } else await respuesta.arrayBuffer();
        }));
      }
      tiempos.sort((a, b) => a - b);
      return { escenario, solicitudes: cantidad, concurrencia,
        p95Ms: Math.round(tiempos[Math.ceil(tiempos.length * 0.95) - 1]),
        maxMs: Math.round(tiempos.at(-1) ?? 0) };
    }

    const hoy = new Date().toISOString().slice(0, 10);
    const resultados = [
      await medir('Catálogo', 50, 10, () => fetch(`${base}/productos?limit=12&buscar=Pastillas`, { headers })),
      await medir('POS historial', 50, 10, () => fetch(`${base}/ventas?limit=20`, { headers })),
      await medir('Reporte mensual', 30, 5, () => fetch(`${base}/reportes/ventas-mensuales?desde=${hoy}&hasta=${hoy}`, { headers })),
      await medir('Ranking productos', 30, 5, () => fetch(`${base}/reportes/ranking-productos?desde=2025-10-01&hasta=${hoy}`, { headers })),
      await medir('POS registrar venta', 20, 5, () => fetch(`${base}/ventas`, {
        method: 'POST', headers,
        body: JSON.stringify({ idCliente: cliente.id_cliente, modalidadPago: 'CONTADO', metodoCobro: 'EFECTIVO',
          items: [{ idProducto, cantidad: 1 }] }),
      })),
    ];
    process.stdout.write(`${JSON.stringify({ fecha: new Date().toISOString(), base, counts, resultados }, null, 2)}\n`);
    if (resultados.some((r) => r.p95Ms >= 2000)) process.exitCode = 1;
  } finally {
    if (ventas.length) {
      await AppDataSource.query('DELETE FROM movimientos_stock WHERE id_venta = ANY($1)', [ventas]);
      await AppDataSource.query('DELETE FROM ventas WHERE id_venta = ANY($1)', [ventas]);
    }
    const ventasFixture = await AppDataSource.query<Array<{ id_venta: number }>>(
      'SELECT id_venta FROM ventas WHERE numero_venta LIKE $1', [`${prefijo}-V%`]);
    if (ventasFixture.length) {
      await AppDataSource.query('DELETE FROM ventas WHERE id_venta = ANY($1)', [ventasFixture.map((v) => v.id_venta)]);
    }
    if (idProducto) await AppDataSource.query('DELETE FROM productos WHERE id_producto=$1', [idProducto]);
    await AppDataSource.query('DELETE FROM productos WHERE sku LIKE $1', [`${prefijo}-P%`]);
    await AppDataSource.destroy();
  }
}

void main().catch((error: unknown) => {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
});
