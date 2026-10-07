import type { ButtonHTMLAttributes, ReactNode } from "react";
export function Button({
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="button" {...props}>
      {children}
    </button>
  );
}
export function State({
  title,
  children,
  kind = "empty",
}: {
  title: string;
  children?: ReactNode;
  kind?: "empty" | "error" | "loading" | "success";
}) {
  return (
    <div
      className={`state state-${kind}`}
      role={kind === "error" ? "alert" : "status"}
    >
      <span className="state-orbit" aria-hidden="true">
        ✦
      </span>
      <h2>{title}</h2>
      {children}
    </div>
  );
}
