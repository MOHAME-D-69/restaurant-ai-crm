# Restaurant AI CRM Backend — PostgreSQL

## Stack
- Node.js + Express + TypeScript
- PostgreSQL
- JWT
- REST API

## Run without database
Keep `SKIP_DB=true` in `.env` and run:

```bash
npm install
npm run dev
```

## Run with PostgreSQL
1. Create a PostgreSQL database named `restaurant_crm`.
2. Copy `.env.example` to `.env`.
3. Set:

```env
SKIP_DB=false
DATABASE_URL=postgresql://postgres:password@localhost:5432/restaurant_crm
DATABASE_SSL=false
JWT_SECRET=change_this_secret
N8N_API_KEY=change_this_n8n_key
```

4. Run:

```bash
npm install
npm run dev
```

The backend automatically creates the required tables on startup.

## Main tables
- restaurants
- users
- customers
- categories
- menu_items
- menu_images
- orders
- order_items

The API remains the same conceptually, so the Angular frontend and future n8n integration do not need to know that PostgreSQL is underneath.
