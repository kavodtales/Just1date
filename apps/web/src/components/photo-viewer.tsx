"use client";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft } from "lucide-react";
export function PhotoViewer({
  photos,
  name,
  initial,
  onClose,
}: {
  photos: string[];
  name: string;
  initial: number;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null),
    [index, setIndex] = useState(initial);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      className="photo-viewer"
      ref={ref}
      aria-label={`${name}'s gallery`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight")
          setIndex((i) => Math.min(photos.length - 1, i + 1));
        if (e.key === "ArrowLeft") setIndex((i) => Math.max(0, i - 1));
      }}
    >
      <div className="viewer-top">
        <button
          className="square-control"
          aria-label="Close gallery"
          onClick={onClose}
        >
          <ChevronLeft />
        </button>
      </div>
      <img
        className="viewer-image"
        src={photos[index]}
        alt={`${name}, photo ${index + 1}`}
      />
      <div className="viewer-thumbnails">
        {photos.map((src, i) => (
          <button
            key={src}
            className={i === index ? "selected" : ""}
            onClick={() => setIndex(i)}
            aria-label={`Show photo ${i + 1}`}
            aria-pressed={i === index}
          >
            <img src={src} alt="" />
          </button>
        ))}
      </div>
    </dialog>
  );
}
