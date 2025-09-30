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
C:.
└───naratama-backend
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
```
## Setup & Instalasi
# Prerequisites

- Node.js 18+ (recommended)
- npm
- MongoDB instance (local or remote)

# Clone the repository

```powershell
git clone https://github.com/Robot-Pemusnah-Mukalakus/naratama-backend.git
cd naratama-backend
```

# Install dependencies

```powershell
npm install
```

# Environment variables

Create a `.env` file in the project root. You can copy `.env.example` if present.

Required variables:

- `DATABASE_URL` — MongoDB connection string, e.g. `mongodb://localhost:27017/naratama`
- `SESSION_SECRET` — secret string used to sign session cookies
- `PORT` (optional) — port to run the dev server (default: `8080`)

Example `.env`:

```
DATABASE_URL=mongodb://localhost:27017/naratama
SESSION_SECRET=replace-this-with-a-secure-random-string
PORT=8080
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
