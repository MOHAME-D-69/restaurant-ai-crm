import { Router } from 'express';
import crypto from 'crypto';
import { query, getClient } from '../config/db';
import { auth, AuthRequest } from '../middleware/auth';

const router = Router();

const transitions: Record<string, string[]> = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['In Kitchen', 'Cancelled'],
  'In Kitchen': ['Out for Delivery', 'Cancelled'],
  'Out for Delivery': ['Delivered'],
  Delivered: [],
  Cancelled: []
};

export async function createOrder(restaurantId: string, body: any) {
  const customer = (
    await query(
      'SELECT * FROM customers WHERE id=$1 AND restaurant_id=$2',
      [body.customerId, restaurantId]
    )
  ).rows[0];

  if (!customer) {
    throw new Error('Customer not found');
  }

  let subtotal = 0;
  const items: any[] = [];

  for (const item of body.items || []) {
    const p = (
      await query(
        'SELECT id,name,price,available FROM menu_items WHERE id=$1 AND restaurant_id=$2',
        [item.productId, restaurantId]
      )
    ).rows[0];

    if (!p) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    if (!p.available) {
      throw new Error(`${p.name} is unavailable`);
    }

    const quantity = Math.max(1, Number(item.quantity || 1));
    const total = Number(p.price) * quantity;

    subtotal += total;

    items.push({
      productId: p.id,
      name: p.name,
      quantity,
      price: Number(p.price),
      total
    });
  }

  let orderId = '';

  for (let i = 0; i < 20; i++) {
    const candidate = Math.floor(1000 + Math.random() * 9000).toString();

    const exists = await query(
      'SELECT 1 FROM orders WHERE restaurant_id=$1 AND order_id=$2',
      [restaurantId, candidate]
    );

    if (!exists.rowCount) {
      orderId = candidate;
      break;
    }
  }

  if (!orderId) {
    throw new Error('Could not generate unique order ID');
  }

  const deliveryFee = Number(body.deliveryFee || 0);
  const total = subtotal + deliveryFee;
  const orderDbId = crypto.randomUUID();

  const client = await getClient();

  try {
    await client.query('BEGIN');

    const order = (
      await client.query(
        `INSERT INTO orders(
          id,
          restaurant_id,
          order_id,
          customer_id,
          subtotal,
          delivery_fee,
          total,
          address,
          status,
          source
        )
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        RETURNING *`,
        [
          orderDbId,
          restaurantId,
          orderId,
          customer.id,
          subtotal,
          deliveryFee,
          total,
          body.address || customer.address || null,
          'Pending',
          body.source || 'CRM'
        ]
      )
    ).rows[0];

    for (const i of items) {
      await client.query(
        `INSERT INTO order_items(
          id,
          order_id,
          product_id,
          product_name,
          quantity,
          price,
          total
        )
        VALUES($1,$2,$3,$4,$5,$6,$7)`,
        [
          crypto.randomUUID(),
          order.id,
          i.productId,
          i.name,
          i.quantity,
          i.price,
          i.total
        ]
      );
    }

    // FIX:
    // $1 = total amount (numeric)
    // $2 = customer.id (uuid)
    await client.query(
      `UPDATE customers
       SET
         total_orders = total_orders + 1,
         total_spent = total_spent + $1,
         last_order_at = NOW(),
         customer_type = CASE
           WHEN total_orders + 1 >= 10 THEN 'VIP Customer'
           WHEN total_orders + 1 > 1 THEN 'Returning Customer'
           ELSE 'New Customer'
         END,
         updated_at = NOW()
       WHERE id = $2`,
      [
        total,
        customer.id
      ]
    );

    await client.query('COMMIT');

    return {
      ...order,
      items
    };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

router.get(
  '/',
  auth,
  async (req: AuthRequest, res) => {
    const result = await query(
      `SELECT
        o.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        COALESCE(
          json_agg(
            json_build_object(
              'productId', oi.product_id,
              'name', oi.product_name,
              'quantity', oi.quantity,
              'price', oi.price,
              'total', oi.total
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.restaurant_id = $1
      GROUP BY o.id, c.name, c.phone
      ORDER BY o.created_at DESC`,
      [req.user!.restaurantId]
    );

    res.json(result.rows);
  }
);

router.post(
  '/',
  auth,
  async (req: AuthRequest, res) => {
    try {
      const order = await createOrder(
        req.user!.restaurantId,
        req.body
      );

      res.status(201).json(order);
    } catch (e: any) {
      res.status(400).json({
        message: e.message
      });
    }
  }
);

router.get(
  '/:id',
  auth,
  async (req: AuthRequest, res) => {
    const result = await query(
      `SELECT
        o.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        COALESCE(
          json_agg(
            json_build_object(
              'productId', oi.product_id,
              'name', oi.product_name,
              'quantity', oi.quantity,
              'price', oi.price,
              'total', oi.total
            )
          ) FILTER (WHERE oi.id IS NOT NULL),
          '[]'
        ) AS items
      FROM orders o
      JOIN customers c ON c.id = o.customer_id
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.id = $1
        AND o.restaurant_id = $2
      GROUP BY o.id, c.name, c.phone`,
      [
        req.params.id,
        req.user!.restaurantId
      ]
    );

    if (!result.rowCount) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    res.json(result.rows[0]);
  }
);

router.patch(
  '/:id/status',
  auth,
  async (req: AuthRequest, res) => {
    const order = (
      await query(
        'SELECT * FROM orders WHERE id=$1 AND restaurant_id=$2',
        [
          req.params.id,
          req.user!.restaurantId
        ]
      )
    ).rows[0];

    if (!order) {
      return res.status(404).json({
        message: 'Order not found'
      });
    }

    const next = req.body.status;

    const valid = [
      'Pending',
      'Confirmed',
      'In Kitchen',
      'Out for Delivery',
      'Delivered',
      'Cancelled'
    ];

    if (!valid.includes(next)) {
      return res.status(400).json({
        message: 'Invalid status'
      });
    }

    const result = await query(
      `UPDATE orders
       SET status=$1, updated_at=NOW()
       WHERE id=$2
       RETURNING *`,
      [
        next,
        order.id
      ]
    );

    res.json(result.rows[0]);
  }
);

router.delete(
  '/:id',
  auth,
  async (req: AuthRequest, res) => {
    const client = await getClient();

    try {
      await client.query('BEGIN');

      const order = (
        await client.query(
          `SELECT
            id,
            customer_id,
            total
           FROM orders
           WHERE id=$1
             AND restaurant_id=$2
           FOR UPDATE`,
          [
            req.params.id,
            req.user!.restaurantId
          ]
        )
      ).rows[0];

      if (!order) {
        await client.query('ROLLBACK');

        return res.status(404).json({
          message: 'Order not found'
        });
      }

      await client.query(
        'DELETE FROM orders WHERE id=$1 AND restaurant_id=$2',
        [
          req.params.id,
          req.user!.restaurantId
        ]
      );

      await client.query(
        `UPDATE customers
         SET
           total_orders = GREATEST(total_orders - 1, 0),
           total_spent = GREATEST(total_spent - $1, 0),
           updated_at = NOW()
         WHERE id = $2`,
        [
          Number(order.total || 0),
          order.customer_id
        ]
      );

      await client.query('COMMIT');

      res.json({
        success: true
      });
    } catch (e) {
      await client.query('ROLLBACK');

      res.status(500).json({
        message: 'Could not delete order'
      });
    } finally {
      client.release();
    }
  }
);

export default router;