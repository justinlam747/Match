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

// POST — save or update a key
export async function POST(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const body = await request.json();
  const { provider, apiKey } = body as {
    provider: "anthropic" | "openai";
    apiKey: string;
  };

  if (!provider || !apiKey) {
    return NextResponse.json(
      { error: "provider and apiKey are required" },
      { status: 400 }
    );
  }

  if (!["anthropic", "openai"].includes(provider)) {
    return NextResponse.json(
      { error: "provider must be 'anthropic' or 'openai'" },
      { status: 400 }
    );
  }

  // Basic key format validation
  if (provider === "anthropic" && !apiKey.startsWith("sk-ant-")) {
    return NextResponse.json(
      { error: "Anthropic keys start with sk-ant-" },
      { status: 400 }
    );
  }
  if (provider === "openai" && !apiKey.startsWith("sk-")) {
    return NextResponse.json(
      { error: "OpenAI keys start with sk-" },
      { status: 400 }
    );
  }

  const { encrypted, iv, authTag } = encrypt(apiKey);
  const keyHint = maskKey(apiKey);

  // Upsert: delete existing key for this provider, then insert
  await db
    .delete(apiKeys)
    .where(
      and(eq(apiKeys.userId, user.id), eq(apiKeys.provider, provider))
    );

  const [saved] = await db
    .insert(apiKeys)
    .values({
      userId: user.id,
      provider,
      encryptedKey: encrypted,
      keyHint,
      iv,
      authTag,
    })
    .returning({ id: apiKeys.id, provider: apiKeys.provider, keyHint: apiKeys.keyHint });

  return NextResponse.json({ key: saved });
}

// DELETE — remove a key
export async function DELETE(request: NextRequest) {
  const user = await getApiUser();
  if (!user) return unauthorized();

  const { searchParams } = new URL(request.url);
  const provider = searchParams.get("provider");

  if (!provider || !["anthropic", "openai"].includes(provider)) {
    return NextResponse.json(
      { error: "provider query param required (anthropic or openai)" },
      { status: 400 }
    );
  }

  await db
    .delete(apiKeys)
    .where(
      and(
        eq(apiKeys.userId, user.id),
        eq(apiKeys.provider, provider as "anthropic" | "openai")
      )
    );

  return NextResponse.json({ deleted: true });
}
