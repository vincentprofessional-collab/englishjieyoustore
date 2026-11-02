"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import styles from "./post-image-gallery.module.css";

export type PostGalleryImage = { alt?: string; caption?: string; url: string };

export function PostImageGallery({ images, title }: { images: PostGalleryImage[]; title: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  if (images.length === 0) return null;

  const image = images[activeIndex];
  const moveImage = (direction: -1 | 1) => {
    setActiveIndex((index) => (index + direction + images.length) % images.length);
  };
  const handleDialogKeyDown = (event: KeyboardEvent<HTMLDialogElement>) => {
    if (event.key === "ArrowLeft" && images.length > 1) {
      event.preventDefault();
      moveImage(-1);
    } else if (event.key === "ArrowRight" && images.length > 1) {
      event.preventDefault();
      moveImage(1);
    }
  };

  return (
    <figure aria-label={`${title}图片`} className={styles.gallery}>
      <div aria-label={`${title}图片轮播`} aria-roledescription="轮播图" className={styles.frame} role="group">
        <Image alt={image.alt || image.caption || title} className={styles.image} fill priority={activeIndex === 0} sizes="(max-width: 760px) 100vw, 860px" src={image.url} unoptimized />
        {images.length > 1 ? <>
          <button aria-label="上一张图片" className={`${styles.arrow} ${styles.previous}`} onClick={() => moveImage(-1)} type="button">‹</button>
          <button aria-label="下一张图片" className={`${styles.arrow} ${styles.next}`} onClick={() => moveImage(1)} type="button">›</button>
        </> : null}
        <button aria-label="全屏查看图片" className={styles.fullscreenButton} onClick={() => dialogRef.current?.showModal()} type="button">⛶<span>全屏</span></button>
      </div>
      <figcaption className={styles.caption}>
        <span>{image.caption || title}</span>
        {images.length > 1 ? <span aria-live="polite">{activeIndex + 1} / {images.length}</span> : null}
      </figcaption>
      <dialog aria-label={`${title}图片全屏查看`} className={styles.lightbox} onClick={(event) => { if (event.target === event.currentTarget) dialogRef.current?.close(); }} onKeyDown={handleDialogKeyDown} ref={dialogRef}>
        <header className={styles.lightboxHeader}>
          <span aria-live="polite">{activeIndex + 1} / {images.length}{image.caption ? ` · ${image.caption}` : ""}</span>
          <button aria-label="关闭全屏图片" onClick={() => dialogRef.current?.close()} type="button">×</button>
        </header>
        <div className={styles.lightboxFrame}>
          <Image alt={image.alt || image.caption || title} className={styles.lightboxImage} fill sizes="100vw" src={image.url} unoptimized />
          {images.length > 1 ? <>
            <button aria-label="上一张图片" className={`${styles.arrow} ${styles.previous}`} onClick={() => moveImage(-1)} type="button">‹</button>
            <button aria-label="下一张图片" className={`${styles.arrow} ${styles.next}`} onClick={() => moveImage(1)} type="button">›</button>
          </> : null}
        </div>
        <footer className={styles.lightboxFooter}>{image.caption || title}</footer>
      </dialog>
    </figure>
  );
}
