# Restaurant AI CRM — Live PostgreSQL + n8n

This version uses the Express API + PostgreSQL as the source of truth. Business mock/demo data and the old local business-data flow are removed. Browser storage is used only for the authenticated JWT session.

## Run locally

### Backend
```powershell
cd backend
npm install
# create backend/.env from backend/.env.example and set SKIP_DB=false
npm run dev
```

The API runs on `http://localhost:3000`.

### Frontend
Open a second terminal:

```powershell
cd frontend
npm install
npm start
```

The Angular app runs on `http://localhost:4200`.

## Database

Set `DATABASE_URL` to your hosted PostgreSQL/Neon connection string and `DATABASE_SSL=true` when required by the provider. The backend creates the required tables on startup.

## Live features

- Login/register/forgot/reset password through the API.
- Orders loaded from PostgreSQL.
- Manual order creation from the CRM.
- Manual order status changes persisted to PostgreSQL.
- Delete orders, customers, menu products, menu categories and menu images.
- Menu image upload stores the selected image in PostgreSQL.
- Dashboard statistics come from PostgreSQL APIs.
- Restaurant profile and AI knowledge are stored in PostgreSQL.

## n8n / Automation integration

Integration endpoints are protected by the `x-api-key` header. They also require `x-restaurant-id` so one automation key can be scoped to a restaurant.

- `GET /api/integration/restaurant`
- `GET /api/integration/menu`
- `GET /api/integration/customers/:phone`
- `POST /api/integration/customers`
- `POST /api/integration/orders`
- `GET /api/integration/orders/:orderId`
- `PATCH /api/integration/orders/:orderId/status`
- `PATCH /api/integration/orders/:orderId/cancel`
- `GET /api/integration/menu/images`

The CRM displays the 4-digit `orderId` as the customer-facing **Automation Code**. Use that code in n8n to retrieve the order, check its status, change its status, or cancel it.

### n8n request headers

```text
x-api-key: <your N8N_API_KEY>
x-restaurant-id: <the restaurant UUID>
```

Do not put the API key in the frontend.
