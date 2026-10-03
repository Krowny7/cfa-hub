"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// « Se connecter » de la barre du haut (visiteur). Masqué sur /login, où le
// bouton Google est déjà la seule action en encre de l'écran.
export function LoginLink({ label }: { label: string }) {
  const pathname = usePathname() || "/";
  if (pathname.startsWith("/login")) return null;
  return (
    <Link className="btn btn-primary btn-sm whitespace-nowrap px-4" href="/login">
      {label}
    </Link>
  );
}
