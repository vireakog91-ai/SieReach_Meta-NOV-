import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

export async function seedInitialUsers() {
  const adminPasswordHash = await hashPassword("admin123");
  const clientPasswordHash = await hashPassword("demo123");

  const admin = await prisma.user.upsert({
    where: { email: "admin@sielab.com" },
    update: {},
    create: {
      email: "admin@sielab.com",
      name: "SieLab Admin",
      passwordHash: adminPasswordHash,
      role: "ADMIN",
      isActive: true,
    },
  });

  const client = await prisma.user.upsert({
    where: { email: "client@demo.com" },
    update: {},
    create: {
      email: "client@demo.com",
      name: "Demo Client",
      passwordHash: clientPasswordHash,
      role: "CLIENT",
      isActive: true,
    },
  });

  return { admin, client };
}
