import Image from "next/image";

import { cn } from "@/lib/utils";

type DashAILogoProps = {
  size?: number;
  showText?: boolean;
  subtitle?: string;
  priority?: boolean;
  className?: string;
  textClassName?: string;
};

export function DashAILogo({
  size = 48,
  showText = false,
  subtitle = "ERP + AI Business Workspace",
  priority = false,
  className,
  textClassName,
}: DashAILogoProps) {
  return (
    <div className={cn("inline-flex min-w-0 items-center gap-3", className)}>
      <Image
        src="/icons/dashai-icon-512.png"
        alt="Logo DashAI"
        width={size}
        height={size}
        priority={priority}
        className="shrink-0 rounded-[28%] shadow-lg shadow-blue-950/20"
      />

      {showText ? (
        <div className={cn("min-w-0", textClassName)}>
          <p className="truncate text-xl font-black tracking-tight">DashAI</p>
          <p className="truncate text-xs font-semibold text-slate-500">
            {subtitle}
          </p>
        </div>
      ) : null}
    </div>
  );
}
