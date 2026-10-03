import { initials } from "@/components/classement/format";

// Avatar rond : photo de profil, sinon initiales sur fond papier. Sans état :
// utilisable côté serveur comme côté client.
export function Avatar({ src, name, size = 36, className = "" }: { src: string | null | undefined; name: string; size?: number; className?: string }) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt="" width={size} height={size} className={"shrink-0 rounded-full object-cover " + className} style={{ width: size, height: size }} />
    );
  }
  return (
    <span
      aria-hidden
      className={"grid shrink-0 place-items-center rounded-full border border-line bg-surface-2 font-bold text-muted " + className}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.32)) }}
    >
      {initials(name)}
    </span>
  );
}
