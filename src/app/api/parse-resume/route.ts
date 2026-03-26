import { NextRequest, NextResponse } from "next/server";
import { parseResume } from "@/lib/ai/parse-resume";
import { db } from "@/lib/db";
import { resumes } from "@/lib/db/schema";
import { getApiUser, unauthorized } from "@/lib/supabase/api-auth";
import { logAuditEvent } from "@/lib/audit/log";

async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  // Dynamic require to handle pdf-parse ESM/CJS compat
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const pdfParse = require("pdf-parse");
  const data = await pdfParse(buffer);
  return data.text;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getApiUser();
    if (!user) return unauthorized();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "Only PDF files are supported" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const rawText = await extractTextFromPDF(buffer);

    if (!rawText.trim()) {
      return NextResponse.json(
        { error: "Could not extract text from PDF" },
        { status: 400 }
      );
    }

    const parsedData = await parseResume(rawText);

    const [resume] = await db
      .insert(resumes)
      .values({
        userId: user.id,
        rawText,
        parsedData,
      })
      .returning();

    await logAuditEvent({
      userId: user.id,
      action: "resume.uploaded",
      entityType: "resume",
      entityId: resume.id,
      metadata: { fileName: file.name, textLength: rawText.length },
    });

    return NextResponse.json({
      id: resume.id,
      parsedData,
    });
  } catch (error) {
    console.error("Resume parse error:", error);
    return NextResponse.json(
      { error: "Failed to parse resume" },
      { status: 500 }
    );
  }
}
