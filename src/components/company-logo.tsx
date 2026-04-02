"use client";

import { useState } from "react";

/**
 * Brand color used for fallback company logos.
 * Change this one variable to update the color everywhere.
 */
export const BRAND_COLOR = "#F26522";

export function CompanyLogo({
  logoUrl,
  companyName,
  size = "sm",
}: {
  logoUrl?: string | null;
  companyName: string;
  size?: "sm" | "md" | "lg";
}) {
  const [failed, setFailed] = useState(false);

  const dims = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-12 h-12",
  }[size];

  const textSize = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  }[size];

  const showImage = logoUrl && !logoUrl.includes("missing") && !failed;

  if (showImage) {
    return (
      <img
        src={logoUrl}
        alt=""
        onError={() => setFailed(true)}
        className={`${dims} rounded object-contain shrink-0 bg-muted`}
      />
    );
  }

  return (
    <div
      className={`${dims} rounded flex items-center justify-center shrink-0`}
      style={{ backgroundColor: BRAND_COLOR }}
    >
      <span className={`${textSize} font-bold text-white`}>
        {companyName[0]?.toUpperCase()}
      </span>
    </div>
  );
}
