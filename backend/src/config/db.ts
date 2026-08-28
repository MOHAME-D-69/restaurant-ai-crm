import { Pool, QueryResultRow } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  max: Number(process.env.DB_POOL_MAX || 10)
});

export async function query<T extends QueryResultRow = any>(text: string, params: any[] = []) {
  return pool.query<T>(text, params);
}

export async function getClient() { return pool.connect(); }

export async function connectDB() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is missing');
  const client = await pool.connect();
  try {
    await client.query('SELECT 1');
    await client.query(`
      CREATE TABLE IF NOT EXISTS restaurants (
        id UUID PRIMARY KEY,
        name VARCHAR(200) NOT NULL,
        phone VARCHAR(50), address TEXT, description TEXT,
        knowledge TEXT NOT NULL DEFAULT '',
        working_hours JSONB NOT NULL DEFAULT '{}'::jsonb,
        delivery JSONB NOT NULL DEFAULT '{"available":true,"fee":0,"minimumOrder":0,"areas":[]}'::jsonb,
        payment_methods JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY, restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL, email VARCHAR(255) NOT NULL UNIQUE, password TEXT NOT NULL,
        role VARCHAR(50) NOT NULL DEFAULT 'admin', created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY, restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL, phone VARCHAR(50) NOT NULL, address TEXT,
        total_orders INTEGER NOT NULL DEFAULT 0, total_spent NUMERIC(12,2) NOT NULL DEFAULT 0,
        customer_type VARCHAR(50) NOT NULL DEFAULT 'New Customer', last_order_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(restaurant_id, phone)
      );
      CREATE TABLE IF NOT EXISTS categories (
        id UUID PRIMARY KEY, restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        name VARCHAR(150) NOT NULL, description TEXT, is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS menu_items (
        id UUID PRIMARY KEY, restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
        name VARCHAR(200) NOT NULL, description TEXT, price NUMERIC(12,2) NOT NULL,
        image TEXT, available BOOLEAN NOT NULL DEFAULT TRUE, featured BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS menu_images (
        id UUID PRIMARY KEY, restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        image_url TEXT NOT NULL, title VARCHAR(200), display_order INTEGER NOT NULL DEFAULT 0,
        is_active BOOLEAN NOT NULL DEFAULT TRUE, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS orders (
        id UUID PRIMARY KEY, restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
        order_id VARCHAR(4) NOT NULL, customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
        subtotal NUMERIC(12,2) NOT NULL DEFAULT 0, delivery_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
        total NUMERIC(12,2) NOT NULL DEFAULT 0, address TEXT,
        status VARCHAR(30) NOT NULL DEFAULT 'Pending', source VARCHAR(50) NOT NULL DEFAULT 'CRM',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(restaurant_id, order_id)
      );
      CREATE TABLE IF NOT EXISTS order_items (
        id UUID PRIMARY KEY, order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
        product_name VARCHAR(200) NOT NULL, quantity INTEGER NOT NULL CHECK(quantity > 0),
        price NUMERIC(12,2) NOT NULL, total NUMERIC(12,2) NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_customers_restaurant ON customers(restaurant_id);
      CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created ON orders(restaurant_id, created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
      CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant ON menu_items(restaurant_id);
    `);
    console.log('PostgreSQL connected and schema ready');
  } finally { client.release(); }
}

export { pool };
