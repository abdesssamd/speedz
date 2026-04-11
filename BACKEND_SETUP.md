# Backend Setup

## 1. MySQL

Create a local database named `fooddelyvry`.

Default connection expected by the backend:

```env
DATABASE_URL="mysql://root:password@localhost:3306/fooddelyvry"
```

You can edit [backend/.env](/e:/fooddelyvry/backend/.env) if your local credentials differ.

## 2. Prisma

Run these commands:

```bash
cd backend
npm run prisma:generate
npm run prisma:push
npm run prisma:seed
```

## 3. Start the API

```bash
npm run backend
```

Admin seed credentials:

```text
admin@fooddelyvry.app
admin1234
```

Customer demo account seeded for the mobile app:

```text
nina.morel@demo.app
client1234
```

## 4. Start the admin dashboard

```bash
npm run admin
```

If needed, set [admin/.env.example](/e:/fooddelyvry/admin/.env.example) as `.env` with your API URL.

## 5. Start the mobile app

```bash
npm start
```

For a physical device, set:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:4100
```
