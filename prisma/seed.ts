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
    // await prisma.user.deleteMany({});

    console.log("Existing data cleared");

    const rooms = [
      {
        amenities: ["Whiteboard", "Proyektor", "AC", "WiFi"],
        capacity: 6,
        description:
          "Ruang diskusi privat untuk grup kecil dengan fasilitas lengkap",
        hourlyRate: 50000,
        name: "Ruang Diskusi Kecil 1",
        roomNumber: "SD001",
        type: "SMALL_DISCUSSION" as const,
      },
      {
        amenities: ["Whiteboard", "TV LED", "AC", "WiFi"],
        capacity: 8,
        description: "Ruang diskusi privat dengan TV LED untuk presentasi",
        hourlyRate: 50000,
        name: "Ruang Diskusi Kecil 2",
        roomNumber: "SD002",
        type: "SMALL_DISCUSSION" as const,
      },
      {
        amenities: ["Whiteboard", "AC", "WiFi"],
        capacity: 6,
        description: "Ruang diskusi sederhana untuk grup kecil",
        hourlyRate: 45000,
        name: "Ruang Diskusi Kecil 3",
        roomNumber: "SD003",
        type: "SMALL_DISCUSSION" as const,
      },
      {
        amenities: ["Whiteboard", "Flipchart", "AC", "WiFi"],
        capacity: 8,
        description: "Ruang diskusi dengan fasilitas flipchart",
        hourlyRate: 50000,
        name: "Ruang Diskusi Kecil 4",
        roomNumber: "SD004",
        type: "SMALL_DISCUSSION" as const,
      },
      {
        amenities: ["Whiteboard", "AC", "WiFi"],
        capacity: 6,
        description: "Ruang diskusi kompak untuk tim kecil",
        hourlyRate: 45000,
        name: "Ruang Diskusi Kecil 5",
        roomNumber: "SD005",
        type: "SMALL_DISCUSSION" as const,
      },
      {
        amenities: [
          "Proyektor",
          "Sound System",
          "Microphone",
          "AC",
          "WiFi",
          "Catering Setup",
        ],
        capacity: 25,
        description:
          "Ruang pertemuan besar dengan fasilitas lengkap untuk acara formal",
        hourlyRate: 150000,
        name: "Ruang Pertemuan Besar 1",
        roomNumber: "LM001",
        type: "LARGE_MEETING" as const,
      },
      {
        amenities: [
          "Proyektor",
          "Sound System",
          "Microphone",
          "AC",
          "WiFi",
          "Stage",
          "Catering Setup",
        ],
        capacity: 30,
        description:
          "Ruang pertemuan terbesar dengan panggung kecil untuk presentasi",
        hourlyRate: 175000,
        name: "Ruang Pertemuan Besar 2",
        roomNumber: "LM002",
        type: "LARGE_MEETING" as const,
      },
    ];

    await prisma.room.createMany({ data: rooms });
    console.log("Rooms seeded successfully");

    const books = [
      {
        author: "Andrea Hirata",
        availableQuantity: 5,
        category: "Fiction",
        coverImage:
          "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1489732961i/1362193.jpg",
        description:
          "Novel tentang perjuangan anak-anak Belitung menempuh pendidikan",
        genre: ["Novel", "Indonesian Literature"],
        isbn: "9786020633084",
        language: "Indonesian",
        location: "A1-B2-C1",
        pages: 534,
        publisher: "Bentang Pustaka",
        publishYear: 2020,
        quantity: 5,
        title: "Laskar Pelangi",
      },
      {
        author: "James Clear",
        availableQuantity: 3,
        category: "Non-Fiction",
        coverImage:
          "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1655988385i/40121378.jpg",
        description:
          "Panduan praktis membangun kebiasaan baik dan menghilangkan kebiasaan buruk",
        genre: ["Self Help", "Psychology"],
        isbn: "9786024246945",
        language: "Indonesian",
        location: "B1-A3-C2",
        pages: 352,
        publisher: "Gramedia Pustaka Utama",
        publishYear: 2019,
        quantity: 3,
        title: "Atomic Habits",
      },
      {
        author: "Yuval Noah Harari",
        availableQuantity: 2,
        category: "History",
        coverImage:
          "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1500472839i/35705551.jpg",
        description:
          "Eksplorasi tentang evolusi manusia dari pemburu-pengumpul hingga era modern",
        genre: ["History", "Anthropology", "Philosophy"],
        isbn: "9786230030573",
        language: "Indonesian",
        location: "C1-B1-A2",
        pages: 512,
        publisher: "Pustaka Alvabet",
        publishYear: 2021,
        quantity: 2,
        title: "Sapiens: Sejarah Ringkas Umat Manusia",
      },
      {
        author: "Robert C. Martin",
        availableQuantity: 4,
        category: "Technology",
        coverImage:
          "https://m.media-amazon.com/images/S/compressed.photo.goodreads.com/books/1436202607i/3735293.jpg",
        description: "Panduan menulis kode yang bersih dan maintainable",
        genre: ["Programming", "Software Engineering"],
        isbn: "9786022914471",
        language: "Indonesian",
        location: "D1-A1-B3",
        pages: 464,
        publisher: "Informatika",
        publishYear: 2018,
        quantity: 4,
        title: "Clean Code",
      },
    ];

    await prisma.book.createMany({ data: books });
    console.log("Books seeded successfully");

    // const hashedPassword = await bcrypt.hash("password123", 12);
    // const adminPassword = await bcrypt.hash("admin123", 12);

    // const users = [
    //   {
    //     email: "ahmad.wijaya@email.com",
    //     name: "Ahmad Wijaya",
    //     password: hashedPassword,
    //     phoneNumber: "081234567890",
    //     role: "USER" as const,
    //   },
    //   {
    //     email: "siti.nurhaliza@email.com",
    //     name: "Siti Nurhaliza",
    //     password: hashedPassword,
    //     phoneNumber: "082345678901",
    //     role: "USER" as const,
    //   },
    //   {
    //     email: "budi.santoso@email.com",
    //     name: "Budi Santoso",
    //     password: hashedPassword,
    //     phoneNumber: "083456789012",
    //     role: "USER" as const,
    //   },
    //   {
    //     email: "admin@naratama.com",
    //     name: "Admin User",
    //     password: adminPassword,
    //     phoneNumber: "081000000000",
    //     role: "ADMIN" as const,
    //   },
    //   {
    //     email: "staff@naratama.com",
    //     name: "Staff User",
    //     password: hashedPassword,
    //     phoneNumber: "081000000001",
    //     role: "STAFF" as const,
    //   },
    // ];

    // await prisma.user.createMany({ data: users });
    // console.log("Users seeded successfully");

    const announcements = [
      {
        content:
          'Perpustakaan Naratama dengan bangga mengumumkan penambahan 15 buku teknologi terbaru, termasuk "Clean Architecture", "Design Patterns", dan "Machine Learning Basics". Buku-buku ini dapat dipinjam mulai hari ini.',
        createdBy: "Admin Perpustakaan",
        priority: "MEDIUM" as const,
        targetAudience: "ALL" as const,
        title: "Buku Baru: Koleksi Teknologi Terkini",
        type: "NEW_BOOKS" as const,
      },
      {
        content:
          "Mulai minggu depan, 7 ruang baru Perpustakaan Naratama resmi dibuka untuk umum! 5 ruang diskusi kecil (kapasitas 6-8 orang) dan 2 ruang pertemuan besar (kapasitas 25-30 orang). Pemesanan hanya di hari kerja dengan durasi minimal 1 jam. Hubungi kami untuk informasi harga dan reservasi.",
        createdBy: "Manajer Operasional",
        priority: "HIGH" as const,
        targetAudience: "ALL" as const,
        title: "Grand Opening: Ruang Diskusi dan Pertemuan",
        type: "EVENT" as const,
      },
      {
        content:
          "Naratama kini menawarkan sistem membership opsional! Anggota dapat memilih tetap menggunakan sistem commitment fee Rp25.000 atau beralih ke membership dengan berbagai keuntungan. Silakan tanyakan ke petugas untuk detail lebih lanjut.",
        createdBy: "Admin Perpustakaan",
        priority: "MEDIUM" as const,
        targetAudience: "ALL" as const,
        title: "Program Membership Baru",
        type: "POLICY" as const,
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
  .catch((e: unknown) => {
    console.error(e);
    process.exit(1);
  })
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  .finally(async () => {
    await prisma.$disconnect();
    console.log("Database connection closed");
  });
