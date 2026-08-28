import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { connectDB } from './config/db';

import authRoutes from './routes/auth';
import restaurantRoutes from './routes/restaurant';
import menuRoutes from './routes/menu';
import customerRoutes from './routes/customers';
import orderRoutes from './routes/orders';
import dashboardRoutes from './routes/dashboard';
import integrationRoutes from './routes/integration';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (_, res) =>
  res.json({
    success: true,
    message: 'Restaurant CRM API is running',
    database: 'PostgreSQL'
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/restaurant', restaurantRoutes);
app.use('/api/menu', menuRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/integration', integrationRoutes);

export default app;

const port = Number(process.env.PORT || 3000);

if (!process.env.VERCEL) {
  const startServer = async () => {
    if (process.env.SKIP_DB === 'true') {
      console.warn(
        'SKIP_DB=true: starting API without PostgreSQL connection. Database routes require PostgreSQL.'
      );

      app.listen(port, () =>
        console.log(`API running on http://localhost:${port}`)
      );

      return;
    }

    try {
      await connectDB();

      app.listen(port, () =>
        console.log(`API running on http://localhost:${port}`)
      );
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  };

  startServer();
}
