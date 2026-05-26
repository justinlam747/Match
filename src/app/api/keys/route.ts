import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { apiKeys } from "@/lib/db/schema";
import { eq, and } from "drizzle-orm";
import { encrypt, maskKey } from "@/lib/crypto";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";

// GET — list saved keys (masked)
export async function GET() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const keys = await db
    .select({
      id: apiKeys.id,
      provider: apiKeys.provider,
      keyHint: apiKeys.keyHint,
      createdAt: apiKeys.createdAt,
      updatedAt: apiKeys.updatedAt,
    })
    .from(apiKeys)
    .where(eq(apiKeys.userId, user.id));

  return NextResponse.json({ keys });
}

// POST — save or update the user's OpenAI key
export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { apiKey } = body as { apiKey: string };

  if (!apiKey) {
    return NextResponse.json({ error: "apiKey is required" }, { status: 400 });
  }
  if (!apiKey.startsWith("sk-")) {
    return NextResponse.json(
      { error: "OpenAI keys start with sk-" },
      { status: 400 }
    );
  }

  const { encrypted, iv, authTag } = encrypt(apiKey);
  const keyHint = maskKey(apiKey);

  // Upsert in a transaction to prevent losing the key if the insert fails
  const [saved] = await db.transaction(async (tx) => {
    await tx
      .delete(apiKeys)
      .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, "openai")));

    return tx
      .insert(apiKeys)
      .values({
        userId: user.id,
        provider: "openai",
        encryptedKey: encrypted,
        keyHint,
        iv,
        authTag,
      })
      .returning({ id: apiKeys.id, provider: apiKeys.provider, keyHint: apiKeys.keyHint });
  });

  return NextResponse.json({ key: saved });
}

// DELETE — remove the user's OpenAI key
export async function DELETE() {
  const user = await getApiUser();
  if (!user) return unauthorized();

  await db
    .delete(apiKeys)
    .where(and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, "openai")));

  return NextResponse.json({ deleted: true });
}
