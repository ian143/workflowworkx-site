import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { auditBrandVault } from "@/lib/vault/audit";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const vault = await db.identityVault.findUnique({
    where: { userId: session.user.id },
  });

  if (!vault) {
    return NextResponse.json({ error: "No vault found" }, { status: 404 });
  }

  const result = auditBrandVault(vault.vaultData);

  await db.identityVault.update({
    where: { id: vault.id },
    data: {
      auditStatus: result.status,
      auditResults: JSON.stringify(result),
    },
  });

  return NextResponse.json(result);
}
