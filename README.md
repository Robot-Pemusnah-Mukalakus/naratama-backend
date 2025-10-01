# Naratama Backend

Aplikasi Perpustakaan Naratama merupakan sistem digital terintegrasi yang dirancang untuk mempermudah layanan peminjaman buku dan ruang diskusi secara online. Melalui aplikasi ini, pengunjung dapat mengecek ketersediaan koleksi, memesan ruang sesuai jadwal yang berlaku, serta mengelola membership dan commitment fee tanpa harus mengubah kebiasaan lama. Selain itu, aplikasi juga menyediakan fitur pengumuman buku baru dan informasi penting secara digital, sehingga komunikasi dengan pengunjung menjadi lebih cepat, efisien, dan mudah diakses.

## The Teams:

| Member                 | NIM                |
| ---------------------- | ------------------ |
| @runsdev               | 23/514148/TK/56466 |
| @SentientCorn          | 23/518350/TK/57045 |
| @LaluKevinProudyHandal | 23/515833/TK/56745 |
| @rafeyyy1              | 23/512856/TK/56361 |
| @Dapreall              | 23/522772/TK/57743 |

## Struktur Folder & File

```
naratama-backend
    │   .env
    │   .gitignore
    │   .nvmrc
    │   .prettierignore
    │   eslint.config.js
    │   index.ts
    │   LICENSE
    │   package-lock.json
    │   package.json
    │   README.md
    │   tsconfig.build.json
    │   tsconfig.json
    │   vercel.json
    │   vitest.config.js
    │
    ├───config
    │       passport.ts
    │
    ├───docs
    │       api-endpoints.md
    │       openapi.json
    │
    ├───lib
    │       prisma.ts
    │
    ├───middleware
    │       auth.ts
    │       validation.ts
    │
    ├───prisma
    │       schema.prisma
    │
    ├───routes
    │       announcements.ts
    │       auth.ts
    │       book-loans.ts
    │       books-advanced.ts
    │       books.ts
    │       rooms.ts
    │       users.ts
    │
    ├───utils
    │       random.ts
    │       validation.ts
    │
    ├───validations
    │       announcement.ts
    │       auth.ts
    │       bookLoans.ts
    │       books.ts
    │       booksAdvanced.ts
    │       index.ts
    │       membership.ts
    │       queries.ts
    │       roomBookings.ts
    │       rooms.ts
    │       users.ts
    │
    └───__tests__
            auth.spec.ts
            books.spec.ts
            users.spec.ts
            roomBookings.spec.ts (incomplete)
            rooms.spec.ts (incomplete)
            bookLoans.spec.ts (incomplete)
            announcements.spec.ts (incomplete)

```

## Setup & Instalasi

# Prerequisites

- Node.js 18+ (recommended)
- npm
- MongoDB instance (local or remote)
- Google OAuth 2.0 credentials (for Google login)

# Clone the repository

```powershell
git clone https://github.com/Robot-Pemusnah-Mukalakus/naratama-backend.git
cd naratama-backend
```

# Install dependencies

```powershell
npm install
```

# Run the development server

```powershell
npm run dev
```

# Environment variables

Create a `.env` file in the project root. You can copy `.env.example` if present.

Example `.env`:

```yaml
# Server Configuration
PORT=8080

# MongoDB Configuration (used by Prisma and session store)
DATABASE_URL="mongodb://localhost:27017/naratama-library"

# For MongoDB Atlas (replace with your connection string):
# DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/naratama-library?retryWrites=true&w=majority"

# Session Configuration
SESSION_SECRET="your-super-secret-session-key-change-this-in-production-256-bit-minimum"

# Google OAuth Configuration
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"
GOOGLE_CALLBACK_URL="http://localhost:8080/api/auth/google/callback"

# CORS Configuration
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

## 🛠️ Technologies Used

- **Backend Framework**
  - Node.js
  - Express.js

- **Database**
  - MongoDB
  - Prisma ORM

- **Authentication**
  - Passport.js
    - passport-local
    - passport-google-oauth20
  - bcrypt (password hashing)

- **Session Management**
  - express-session
  - connect-mongo (MongoDB store)

- **Configuration & Utilities**
  - dotenv (environment variable management)
  - cors (CORS middleware)
  - zod (schema validation)
  - TypeScript (type-safe development)

- **Code Quality**
  - ESLint
  - Prettier

- **Testing**
  - Vitest
  - Supertest
