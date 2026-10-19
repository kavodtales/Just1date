import Link from "next/link";
export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="reference-logo" aria-label="Just1date home">
      <img src="/images/logo.png" alt="Just1date" width={199} height={122} />
    </Link>
  );
}
