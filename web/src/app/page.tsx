import fs from "node:fs/promises";
import path from "node:path";
import Dashboard from "@/components/Dashboard";
import StructuredData from "@/components/StructuredData";
import type { IndexFile } from "@/lib/types";

export default async function Page() {
  const file = path.join(process.cwd(), "public", "data", "index.json");
  const meta = JSON.parse(await fs.readFile(file, "utf-8")) as IndexFile;
  return (
    <>
      <StructuredData sources={meta.sources} />
      <Dashboard meta={meta} />
    </>
  );
}
