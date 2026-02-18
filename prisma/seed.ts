import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Seed founder account: ian@workflowworkx.com
  const founderEmail = "ian@workflowworkx.com";

  const existing = await prisma.user.findUnique({
    where: { email: founderEmail },
  });

  if (!existing) {
    // Default password — change on first login
    const passwordHash = await hash("ChangeMe123!", 12);

    const founder = await prisma.user.create({
      data: {
        email: founderEmail,
        passwordHash,
        name: "Ian",
        subscriptionStatus: "active",
      },
    });

    console.log(`Founder account created: ${founder.email} (id: ${founder.id})`);
    console.log("IMPORTANT: Change the default password after first login.");
  } else {
    // Ensure existing founder account is always active
    await prisma.user.update({
      where: { email: founderEmail },
      data: { subscriptionStatus: "active" },
    });
    console.log(`Founder account already exists: ${founderEmail} — ensured active status.`);
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
