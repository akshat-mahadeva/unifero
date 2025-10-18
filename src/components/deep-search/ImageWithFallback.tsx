"use client";
import React, { ImgHTMLAttributes, useState } from "react";
import { ImageIcon } from "lucide-react";

type Props = {
  src?: string | null;
  alt?: string;
  className?: string;
  width?: number | string;
  height?: number | string;
} & ImgHTMLAttributes<HTMLImageElement>;

const ImageWithFallback: React.FC<Props> = ({
  src,
  alt,
  className,
  width,
  height,
  ...rest
}) => {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`inline-flex items-center justify-center ${className || ""}`}
        style={{ width, height }}
      >
        <ImageIcon className={`w-full h-full text-muted-foreground`} />
      </div>
    );
  }

  return (
    // use native img for simpler onError handling and consistent sizing
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      {...(typeof width === "number" ? { width } : {})}
      {...(typeof height === "number" ? { height } : {})}
      className={className}
      onError={() => setFailed(true)}
      {...rest}
    />
  );
};

export default ImageWithFallback;
