import Link from "next/link";
import { Heart } from "lucide-react";
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="premium-brand" aria-label="Just1date home">
      <span className="brand-symbol">
        <Heart size={20} strokeWidth={1.7} />
      </span>
      just<span className="brand-one">1</span>date
      <span className="brand-period">.</span>
    </Link>
  );
}
