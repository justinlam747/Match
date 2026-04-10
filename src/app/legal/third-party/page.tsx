import { readFileSync } from "node:fs";
import path from "node:path";

export const metadata = {
  title: "Third-Party Licenses",
};

const licenseText = readFileSync(
  path.join(process.cwd(), "THIRD_PARTY_LICENSES.md"),
  "utf-8"
);

export default function ThirdPartyLicensesPage() {
  return (
    <main className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="text-2xl font-semibold mb-6">Third-Party Licenses and Credits</h1>
      <pre className="text-xs whitespace-pre-wrap bg-muted/40 p-4 rounded border">
        {licenseText}
      </pre>
    </main>
  );
}
