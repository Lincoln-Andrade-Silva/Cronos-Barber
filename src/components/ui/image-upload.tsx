"use client";

import { useState } from "react";
import { Camera } from "lucide-react";

interface ImageUploadProps {
  name: string;
  initialUrl?: string | null;
  /** Lado do círculo em px. */
  size?: number;
  label?: string;
}

export function ImageUpload({
  name,
  initialUrl,
  size = 96,
  label = "Alterar imagem",
}: ImageUploadProps) {
  const [preview, setPreview] = useState<string | null>(initialUrl ?? null);
  const id = `upload-${name}`;

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) setPreview(URL.createObjectURL(file));
  }

  return (
    <label
      htmlFor={id}
      className="group relative cursor-pointer overflow-hidden rounded-full border border-line bg-surface"
      style={{ width: size, height: size }}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center">
          <Camera className="h-6 w-6 text-muted2" />
        </span>
      )}
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/55 text-white opacity-0 transition group-hover:opacity-100">
        <Camera className="h-5 w-5" />
        <span className="text-[10px] font-medium">{label}</span>
      </span>
      <input
        id={id}
        name={name}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={onChange}
        className="hidden"
      />
    </label>
  );
}
