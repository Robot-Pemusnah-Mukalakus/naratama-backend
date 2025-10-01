### 1. Auth (routes/auth.ts)

1. POST /api/auth/login
   - Deskripsi: Autentikasi lokal (email/phone + password).
   - Body: { email|phoneNumber, password }
   - Otorisasi: publik
   - Validasi: `LoginSchema`
   - Catatan: Menggunakan passport local; jika sukses membuat session (req.logIn) dan mengembalikan data user.

2. GET /api/auth/google
   - Deskripsi: Inisiasi OAuth Google.
   - Otorisasi: publik
   - Catatan: Mengarahkan ke Google untuk otorisasi (scope: profile, email).

3. GET /api/auth/google/callback
   - Deskripsi: Callback Google OAuth.
   - Otorisasi: publik
   - Catatan: Jika sukses, mengembalikan JSON berisi data user seperti endpoint login.

4. POST /api/auth/register
   - Deskripsi: Registrasi user baru dan auto-login.
   - Body: { email, name, password, phoneNumber }
   - Otorisasi: publik
   - Validasi: `RegisterSchema`
   - Catatan: Password di-hash (bcrypt). Jika user dengan email/phone sudah ada, menolak.

5. POST /api/auth/logout
   - Deskripsi: Logout dan menghancurkan session.
   - Otorisasi: `checkAuth`

6. GET /api/auth/me
   - Deskripsi: Ambil profil user yang sedang login.
   - Otorisasi: `checkAuth`

7. POST /api/auth/change-password
   - Deskripsi: Ubah password saat ini.
   - Body: { currentPassword, newPassword }
   - Otorisasi: `checkAuth`
   - Validasi: `ChangePasswordSchema`
   - Catatan: Memverifikasi password lama, lalu meng-hash dan menyimpan password baru.

8. POST /api/auth/set-password
   - Deskripsi: Menetapkan password untuk akun tanpa password (mis. OAuth signup).
   - Body: { email, password }
   - Otorisasi: publik
   - Validasi: `SetPasswordSchema`

---

### 2. Announcements (routes/announcements.ts)

1. GET /api/announcements
   - Deskripsi: Ambil daftar announcement aktif.
   - Query: `limit` (default 20), `page` (default 1), `priority`, `targetAudience`, `type`
   - Otorisasi: publik
   - Catatan: Menggunakan where { isActive: true } dan mengembalikan paging (count, total, totalPages).

2. GET /api/announcements/:id
   - Deskripsi: Ambil detail announcement by id.
   - Params: `id`
   - Otorisasi: publik
   - Catatan: Mengembalikan 404 jika tidak ditemukan atau tidak aktif.

3. POST /api/announcements
   - Deskripsi: Buat announcement baru.
   - Body: { title, content, type, createdBy, priority?, targetAudience? }
   - Otorisasi: `checkStaffOrAdmin`
   - Validasi: `CreateAnnouncementSchema`

4. PUT /api/announcements/:id
   - Deskripsi: Update fields announcement tertentu.
   - Params: `id`
   - Body (boleh sebagian): title, content, type, priority, targetAudience
   - Otorisasi: `checkStaffOrAdmin`
   - Validasi: `UpdateAnnouncementSchema`

5. DELETE /api/announcements/:id
   - Deskripsi: Soft-delete (set isActive=false).
   - Params: `id`
   - Otorisasi: `checkStaffOrAdmin`

---

### 3. Books (routes/books.ts)

1. GET /api/books
   - Deskripsi: Ambil daftar buku aktif.
   - Query: `limit`, `page`, `author`, `category`, `available` ("true" => availableQuantity > 0), `search`
   - Otorisasi: publik
   - Validasi: `GetBookSchema`

2. GET /api/books/categories
   - Deskripsi: Ambil daftar kategori unik dari buku aktif.
   - Otorisasi: publik

3. GET /api/books/new
   - Deskripsi: Ambil daftar buku terbaru (sorted by addedDate desc).
   - Query: `limit` (default 10)
   - Otorisasi: publik

4. GET /api/books/:id
   - Deskripsi: Ambil detail buku.
   - Params: `id`
   - Otorisasi: publik
   - Validasi: `IdParamSchema`

5. POST /api/books
   - Deskripsi: Tambah buku baru.
   - Body: { title, author, category, isbn, quantity, publishYear, publisher, pages, language?, location?, coverImage?, description?, genre? }
   - Otorisasi: `checkStaffOrAdmin`
   - Validasi: `CreateBookSchema`
   - Catatan: Mengecek unique ISBN; availableQuantity diset dari `quantity`.

6. PUT /api/books/:id
   - Deskripsi: Update sebagian field buku.
   - Params: `id`
   - Body: subset dari fields yang diizinkan (author, category, coverImage, description, genre, isbn, language, location, pages, publisher, publishYear, quantity, availableQuantity, title)
   - Otorisasi: `checkStaffOrAdmin`
   - Validasi: `UpdateBookSchema` dan `IdParamSchema` via `validateMultiple`.

7. PUT /api/books/:id/quantity
   - Deskripsi: Update jumlah (quantity / availableQuantity) buku.
   - Otorisasi: `checkStaffOrAdmin`
   - Validasi: `UpdateBookQuantitySchema` dan `IdParamSchema`.

8. DELETE /api/books/:id
   - Deskripsi: Soft-delete (set isActive=false).
   - Otorisasi: `checkStaffOrAdmin`
   - Validasi: `IdParamSchema`

---

### 4. Books Advanced (routes/books-advanced.ts)

1. GET /api/books-advanced/search
   - Deskripsi: Pencarian buku lanjutan dengan filter lebih kaya.
   - Query: `q` (kata kunci), `author`, `category`, `available` (true/false), `minYear`, `maxYear`, `limit`, `page`, `sortBy` (default `addedDate`), `sortOrder` (asc/desc)
   - Otorisasi: publik
   - Validasi: `BookSearchSchema` + `PaginationSchema` via `validateMultiple`
   - Catatan: Mencari di beberapa field (title, author, isbn, description) dan mendukung filter tahun, ketersediaan, dan paging.

---

### 5. Book Loans (routes/book-loans.ts)

1. GET /api/book-loans
   - Deskripsi: Ambil daftar peminjaman buku.
   - Query: `userId`, `bookId`, `status` (LoanStatus), `limit`, `page`
   - Otorisasi: publik (?) — implementasi tampak tidak membatasi secara eksplisit, tapi endpoint pembuatan/ubah memerlukan staff.
   - Validasi: `GetBookLoansSchema` pada query
   - Catatan: Include data book (title, author, isbn) dan user (email, name, membership).

2. GET /api/book-loans/overdue
   - Deskripsi: Ambil daftar peminjaman yang terlambat (dueDate < today dan status ACTIVE).
   - Otorisasi: publik

3. GET /api/book-loans/:id
   - Deskripsi: Ambil detail peminjaman.
   - Params: `id`
   - Otorisasi: publik

4. POST /api/book-loans
   - Deskripsi: Buat peminjaman baru.
   - Body: { userId, bookId, loanDate?, dueDate? }
   - Otorisasi: `checkStaffOrAdmin`
   - Validasi: `CreateBookLoanSchema`
   - Catatan: Memeriksa user & book, ketersediaan, mencegah duplikat peminjaman aktif untuk user yang sama, dan menjalankan transaction untuk membuat record dan mengurangi availableQuantity.

5. PUT /api/book-loans/:id/return
   - Deskripsi: Menandai peminjaman sebagai dikembalikan; menghitung denda jika terlambat.
   - Params: `id`
   - Body: { returnDate }
   - Otorisasi: `checkStaffOrAdmin`
   - Validasi: `UpdateBookLoanSchema`

6. PUT /api/book-loans/:id/extend
   - Deskripsi: Perpanjang masa pinjam.
   - Params: `id`
   - Body: sesuai `RenewBookLoanSchema`
   - Otorisasi: `checkStaffOrAdmin`

---

### 6. Rooms (routes/rooms.ts)

1. GET /api/rooms
   - Deskripsi: Ambil daftar ruangan.
   - Query: `available`, `type`
   - Otorisasi: publik
   - Validasi: `GetRoomQuerySchema`

2. GET /api/rooms/availability/:roomId
   - Deskripsi: Cek ketersediaan ruangan pada tanggal tertentu.
   - Params: `roomId`
   - Query: `date` (ISO date string)
   - Otorisasi: publik
   - Validasi: `RoomIdParamSchema`, `RoomQuerySchema` via `validateMultiple`
   - Catatan: Menolak akhir pekan; mengembalikan existing bookings hari itu.

3. GET /api/rooms/bookings
   - Deskripsi: Ambil daftar booking ruangan.
   - Query: `date`, `limit`, `page`, `roomId`, `status`, `userId`
   - Otorisasi: publik
   - Validasi: `GetRoomBookingsQuerySchema`

4. POST /api/rooms/bookings
   - Deskripsi: Buat booking ruangan.
   - Body: { userId, roomId, bookingDate, startTime, endTime, purpose, specialRequests? }
   - Otorisasi: `checkStaffOrAdmin`
   - Validasi: `CreateRoomBookingSchema`
   - Catatan: Mengecek durasi minimal 1 jam, mengecek konflik booking (PENDING/CONFIRMED), dan memeriksa room.isAvailable.

5. PUT /api/rooms/bookings/:id/status
   - Deskripsi: Update status booking (mis. CONFIRMED, REJECTED).
   - Params: `id`
   - Body: sesuai `UpdateRoomBookingStatusSchema`
   - Otorisasi: `checkStaffOrAdmin`

6. DELETE /api/rooms/bookings/:id
   - Deskripsi: Hapus/tidak aktifkan booking.
   - Params: `id`
   - Otorisasi: `checkStaffOrAdmin`

---

### 7. Users (routes/users.ts)

1. GET /api/users
   - Deskripsi: Ambil daftar user (admin/staff only).
   - Query: `isActive`, `isMember`
   - Otorisasi: `checkStaff`

2. GET /api/users/me
   - Deskripsi: Ambil profil user yang sedang login.
   - Otorisasi: `checkAuth`

3. GET /api/users/:id
   - Deskripsi: Ambil profil user by id. Hanya bisa diakses oleh user itu sendiri atau staff/admin.
   - Params: `id`
   - Otorisasi: `checkAuth` + pemeriksaan role di handler

4. GET /api/users/email/:email
   - Deskripsi: Ambil user berdasarkan email.
   - Params: `email`
   - Otorisasi: `checkStaff`

5. PUT /api/users/:id
   - Deskripsi: Update profil user (name, email).
   - Params: `id`
   - Body: { name?, email? }
   - Otorisasi: `checkAuth` (hanya self atau staff/admin)

6. PUT /api/users/:id/membership
   - Deskripsi: Tambah/ubah membership user (oleh staff).
   - Params: `id`
   - Otorisasi: `checkStaff`

7. DELETE /api/users/:id/membership
   - Deskripsi: Hapus membership user.
   - Otorisasi: `checkStaff`

8. DELETE /api/users/:id
   - Deskripsi: Hapus user (soft delete / set isActive=false).
   - Otorisasi: `checkAdmin`

---
