// Adapted from career-ops (MIT). See THIRD_PARTY_LICENSES.md.
//
// ATS-compliant PDF renderer for tailored resumes. Uses pdfkit (pure Node, no
// browser binaries) so the pipeline runs equally well in serverless and local
// dev. The layout is deliberately single-column, standard headings, selectable
// text, no embedded images — everything an ATS parser expects.

import PDFDocument from "pdfkit";
import type { TailoredResume } from "@/lib/ai/tailor-resume";

export type PageSize = "LETTER" | "A4";

export interface RenderOptions {
  candidateName: string;
  candidateEmail: string;
  pageSize?: PageSize;
  // Optional location/phone/links line — plain text, rendered under the name
  contactLine?: string;
}

const MARGIN = 54; // 0.75" on all sides — plenty for ATS parsers
const ACCENT = "#111111";
const MUTED = "#555555";

/**
 * Render a {@link TailoredResume} into a PDF buffer.
 *
 * The returned Buffer is ATS-friendly:
 *  - Single column, standard fonts (Helvetica) embedded
 *  - Selectable text throughout, no raster images
 *  - UTF-8 throughout so international characters survive
 *  - Standard section headers (Summary, Experience, Projects, Competencies)
 */
export async function renderTailoredResumePdf(
  tailored: TailoredResume,
  opts: RenderOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: opts.pageSize || "LETTER",
        margins: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN },
        info: {
          Title: `${opts.candidateName} — Resume`,
          Author: opts.candidateName,
          Creator: "YCMatch Tailored Resume",
        },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (c: Buffer) => chunks.push(c));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ── Header ────────────────────────────────────────────────────────────
      doc
        .font("Helvetica-Bold")
        .fillColor(ACCENT)
        .fontSize(20)
        .text(opts.candidateName, { align: "left" });

      doc
        .font("Helvetica")
        .fillColor(MUTED)
        .fontSize(10)
        .text(opts.candidateEmail, { continued: !!opts.contactLine });

      if (opts.contactLine) {
        doc.text(`  |  ${opts.contactLine}`);
      }

      doc.moveDown(0.8);

      // ── Summary ──────────────────────────────────────────────────────────
      sectionHeader(doc, "Professional Summary");
      doc
        .font("Helvetica")
        .fillColor(ACCENT)
        .fontSize(10)
        .text(tailored.summary, { align: "justify", lineGap: 2 });
      doc.moveDown(0.6);

      // ── Competencies grid ────────────────────────────────────────────────
      if (tailored.competencyGrid.length > 0) {
        sectionHeader(doc, "Core Competencies");
        for (const group of tailored.competencyGrid) {
          doc
            .font("Helvetica-Bold")
            .fillColor(ACCENT)
            .fontSize(10)
            .text(`${group.label}: `, { continued: true })
            .font("Helvetica")
            .fillColor(MUTED)
            .text(group.items.join(", "));
        }
        doc.moveDown(0.4);
      }

      // ── Experience ───────────────────────────────────────────────────────
      sectionHeader(doc, "Experience");
      for (const exp of tailored.experience) {
        doc
          .font("Helvetica-Bold")
          .fillColor(ACCENT)
          .fontSize(11)
          .text(exp.title, { continued: true })
          .font("Helvetica")
          .fillColor(MUTED)
          .text(` — ${exp.company}`);

        for (const bullet of exp.bullets) {
          doc
            .font("Helvetica")
            .fillColor(ACCENT)
            .fontSize(10)
            .text(`• ${bullet}`, {
              indent: 10,
              lineGap: 1.5,
            });
        }
        if (exp.techUsed.length > 0) {
          doc
            .font("Helvetica-Oblique")
            .fillColor(MUTED)
            .fontSize(9)
            .text(`Tech: ${exp.techUsed.join(", ")}`, { indent: 10 });
        }
        doc.moveDown(0.35);
      }

      // ── Featured projects ────────────────────────────────────────────────
      if (tailored.featuredProjects.length > 0) {
        doc.moveDown(0.2);
        sectionHeader(doc, "Selected Projects");
        for (const project of tailored.featuredProjects) {
          doc
            .font("Helvetica-Bold")
            .fillColor(ACCENT)
            .fontSize(10)
            .text(project.title);
          doc
            .font("Helvetica")
            .fillColor(ACCENT)
            .fontSize(10)
            .text(project.description, { lineGap: 1.5 });
          if (project.tech.length > 0) {
            doc
              .font("Helvetica-Oblique")
              .fillColor(MUTED)
              .fontSize(9)
              .text(`Tech: ${project.tech.join(", ")}`);
          }
          doc.moveDown(0.3);
        }
      }

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sectionHeader(doc: any, title: string): void {
  doc
    .font("Helvetica-Bold")
    .fillColor(ACCENT)
    .fontSize(12)
    .text(title.toUpperCase(), { characterSpacing: 1.2 });

  // Thin divider underneath the header
  const { x, y } = doc;
  doc
    .strokeColor(ACCENT)
    .lineWidth(0.6)
    .moveTo(x, y + 1)
    .lineTo(x + (doc.page.width - MARGIN * 2), y + 1)
    .stroke();

  doc.moveDown(0.35);
}
