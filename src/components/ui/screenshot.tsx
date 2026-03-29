"use client";

import Image from "next/image";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface ScreenshotProps {
  srcLight: string;
  srcDark?: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
}

export default function Screenshot({
  srcLight,
  srcDark,
  alt,
  width,
  height,
  className,
}: ScreenshotProps) {
  const { resolvedTheme } = useTheme();

 
  const [src, setSrc] = useState(srcLight);

  useEffect(() => {
    if (resolvedTheme === "dark" && srcDark) {
      setSrc(srcDark);
    } else {
      setSrc(srcLight);
    }
  }, [resolvedTheme, srcLight, srcDark]);

  return (
    <Image
      src={src}
      alt={alt}
      width={width}
      height={height}
      sizes="(max-width: 768px) 100vw, 1248px"
      className={cn("h-auto w-full", className)}
      priority
    />
  );
}
