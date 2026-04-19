import { requireAuth } from "@/lib/auth";
import MercadoClient from "./MercadoClient";

export default async function MercadoPage() {
  const user = await requireAuth();
  return <MercadoClient userName={user.name} />;
}
