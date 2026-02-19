import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auditBrandVault } from "@/lib/vault/audit";
import { requireActiveSession } from "@/lib/require-subscription";

export async function POST() {
  const { session, error } = await requireActiveSession();
  if (error) return error;

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
