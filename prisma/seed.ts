import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

const seedData = async () => {
  try {
    // Clear existing data
    await prisma.roomBooking.deleteMany({});
    await prisma.bookLoan.deleteMany({});
    await prisma.announcement.deleteMany({});
    await prisma.book.deleteMany({});
    await prisma.room.deleteMany({});
    await prisma.user.deleteMany({});

    console.log("Existing data cleared");

    const rooms = [
      {
        roomNumber: "SD001",
        name: "Ruang Diskusi Kecil 1",
        type: "SMALL_DISCUSSION" as const,
        capacity: 6,
        hourlyRate: 50000,
        amenities: ["Whiteboard", "Proyektor", "AC", "WiFi"],
        description:
          "Ruang diskusi privat untuk grup kecil dengan fasilitas lengkap",
      },
      {
        roomNumber: "SD002",
        name: "Ruang Diskusi Kecil 2",
        type: "SMALL_DISCUSSION" as const,
        capacity: 8,
        hourlyRate: 50000,
        amenities: ["Whiteboard", "TV LED", "AC", "WiFi"],
        description: "Ruang diskusi privat dengan TV LED untuk presentasi",
      },
      {
        roomNumber: "SD003",
        name: "Ruang Diskusi Kecil 3",
        type: "SMALL_DISCUSSION" as const,
        capacity: 6,
        hourlyRate: 45000,
        amenities: ["Whiteboard", "AC", "WiFi"],
        description: "Ruang diskusi sederhana untuk grup kecil",
      },
      {
        roomNumber: "SD004",
        name: "Ruang Diskusi Kecil 4",
        type: "SMALL_DISCUSSION" as const,
        capacity: 8,
        hourlyRate: 50000,
        amenities: ["Whiteboard", "Flipchart", "AC", "WiFi"],
        description: "Ruang diskusi dengan fasilitas flipchart",
      },
      {
        roomNumber: "SD005",
        name: "Ruang Diskusi Kecil 5",
        type: "SMALL_DISCUSSION" as const,
        capacity: 6,
        hourlyRate: 45000,
        amenities: ["Whiteboard", "AC", "WiFi"],
        description: "Ruang diskusi kompak untuk tim kecil",
      },
      {
        roomNumber: "LM001",
        name: "Ruang Pertemuan Besar 1",
        type: "LARGE_MEETING" as const,
        capacity: 25,
        hourlyRate: 150000,
        amenities: [
          "Proyektor",
          "Sound System",
          "Microphone",
          "AC",
          "WiFi",
          "Catering Setup",
        ],
        description:
          "Ruang pertemuan besar dengan fasilitas lengkap untuk acara formal",
      },
      {
        roomNumber: "LM002",
        name: "Ruang Pertemuan Besar 2",
        type: "LARGE_MEETING" as const,
        capacity: 30,
        hourlyRate: 175000,
        amenities: [
          "Proyektor",
          "Sound System",
          "Microphone",
          "AC",
          "WiFi",
          "Stage",
          "Catering Setup",
        ],
        description:
          "Ruang pertemuan terbesar dengan panggung kecil untuk presentasi",
      },
    ];

    await prisma.room.createMany({ data: rooms });
    console.log("Rooms seeded successfully");

    const books = [
      {
        isbn: "9786020633084",
        title: "Laskar Pelangi",
        author: "Andrea Hirata",
        publisher: "Bentang Pustaka",
        publishYear: 2020,
        category: "Fiction",
        genre: ["Novel", "Indonesian Literature"],
        language: "Indonesian",
        pages: 534,
        description:
          "Novel tentang perjuangan anak-anak Belitung menempuh pendidikan",
        quantity: 5,
        availableQuantity: 5,
        location: "A1-B2-C1",
      },
      {
        isbn: "9786024246945",
        title: "Atomic Habits",
        author: "James Clear",
        publisher: "Gramedia Pustaka Utama",
        publishYear: 2019,
        category: "Non-Fiction",
        genre: ["Self Help", "Psychology"],
        language: "Indonesian",
        pages: 352,
        description:
          "Panduan praktis membangun kebiasaan baik dan menghilangkan kebiasaan buruk",
        quantity: 3,
        availableQuantity: 3,
        location: "B1-A3-C2",
      },
      {
        isbn: "9786230030573",
        title: "Sapiens: Sejarah Ringkas Umat Manusia",
        author: "Yuval Noah Harari",
        publisher: "Pustaka Alvabet",
        publishYear: 2021,
        category: "History",
        genre: ["History", "Anthropology", "Philosophy"],
        language: "Indonesian",
        pages: 512,
        description:
          "Eksplorasi tentang evolusi manusia dari pemburu-pengumpul hingga era modern",
        quantity: 2,
        availableQuantity: 2,
        location: "C1-B1-A2",
      },
      {
        isbn: "9786022914471",
        title: "Clean Code",
        author: "Robert C. Martin",
        publisher: "Informatika",
        publishYear: 2018,
        category: "Technology",
        genre: ["Programming", "Software Engineering"],
        language: "Indonesian",
        pages: 464,
        description: "Panduan menulis kode yang bersih dan maintainable",
        quantity: 4,
        availableQuantity: 4,
        location: "D1-A1-B3",
      },
    ];

    await prisma.book.createMany({ data: books });
    console.log("Books seeded successfully");

    const hashedPassword = await bcrypt.hash("password123", 12);
    const adminPassword = await bcrypt.hash("admin123", 12);

    const users = [
      {
        name: "Ahmad Wijaya",
        phoneNumber: "081234567890",
        email: "ahmad.wijaya@email.com",
        password: hashedPassword,
        role: "USER" as const,
      },
      {
        name: "Siti Nurhaliza",
        phoneNumber: "082345678901",
        email: "siti.nurhaliza@email.com",
        password: hashedPassword,
        role: "USER" as const,
      },
      {
        name: "Budi Santoso",
        phoneNumber: "083456789012",
        email: "budi.santoso@email.com",
        password: hashedPassword,
        role: "USER" as const,
      },
      {
        name: "Admin User",
        phoneNumber: "081000000000",
        email: "admin@naratama.com",
        password: adminPassword,
        role: "ADMIN" as const,
      },
      {
        name: "Staff User",
        phoneNumber: "081000000001",
        email: "staff@naratama.com",
        password: hashedPassword,
        role: "STAFF" as const,
      },
    ];

    await prisma.user.createMany({ data: users });
    console.log("Users seeded successfully");

    const announcements = [
      {
        title: "Buku Baru: Koleksi Teknologi Terkini",
        content:
          'Perpustakaan Naratama dengan bangga mengumumkan penambahan 15 buku teknologi terbaru, termasuk "Clean Architecture", "Design Patterns", dan "Machine Learning Basics". Buku-buku ini dapat dipinjam mulai hari ini.',
        type: "NEW_BOOKS" as const,
        priority: "MEDIUM" as const,
        createdBy: "Admin Perpustakaan",
        targetAudience: "ALL" as const,
      },
      {
        title: "Grand Opening: Ruang Diskusi dan Pertemuan",
        content:
          "Mulai minggu depan, 7 ruang baru Perpustakaan Naratama resmi dibuka untuk umum! 5 ruang diskusi kecil (kapasitas 6-8 orang) dan 2 ruang pertemuan besar (kapasitas 25-30 orang). Pemesanan hanya di hari kerja dengan durasi minimal 1 jam. Hubungi kami untuk informasi harga dan reservasi.",
        type: "EVENT" as const,
        priority: "HIGH" as const,
        createdBy: "Manajer Operasional",
        targetAudience: "ALL" as const,
      },
      {
        title: "Program Membership Baru",
        content:
          "Naratama kini menawarkan sistem membership opsional! Anggota dapat memilih tetap menggunakan sistem commitment fee Rp25.000 atau beralih ke membership dengan berbagai keuntungan. Silakan tanyakan ke petugas untuk detail lebih lanjut.",
        type: "POLICY" as const,
        priority: "MEDIUM" as const,
        createdBy: "Admin Perpustakaan",
        targetAudience: "ALL" as const,
      },
    ];

    await prisma.announcement.createMany({ data: announcements });
    console.log("Announcements seeded successfully");

    console.log("✅ Database seeded successfully!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
};

// Main function to run the seeder
async function main() {
  await seedData();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Database connection closed");
  });
