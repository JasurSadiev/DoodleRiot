import { doc, getDoc } from "firebase/firestore";
import { getFbs } from "@/lib/firebase";

export const dynamic = "force-dynamic";

export async function GET() {
  let firebase = false;
  try {
    // A read on a (non-existent) ping doc: resolves when rules allow reads.
    await getDoc(doc(getFbs(), "meta", "ping"));
    firebase = true;
  } catch {
    firebase = false;
  }
  return Response.json({ ok: true, firebase });
}
