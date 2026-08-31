"""Create web-ready portfolio images while preserving the source originals."""

from __future__ import annotations

import argparse
import subprocess
import shutil
from pathlib import Path

from PIL import Image


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = PROJECT_ROOT / "public" / "portfolio-assets"
FFMPEG_BINARIES = tuple(
    (PROJECT_ROOT / "scripts" / "_vendor" / "imageio_ffmpeg" / "binaries").glob(
        "ffmpeg*.exe"
    )
)

STATIC_ASSETS = (
    ("06-early/early-04.png", "06-early/early-04.webp"),
    ("06-early/early-05.png", "06-early/early-05.webp"),
    ("07-other/other-01.png", "07-other/other-01.webp"),
    ("07-other/other-04.png", "07-other/other-04.webp"),
    ("07-other/other-05.png", "07-other/other-05.webp"),
    ("07-other/other-06.png", "07-other/other-06.webp"),
    ("07-other/other-07.png", "07-other/other-07.webp"),
)


def has_alpha(image: Image.Image) -> bool:
    return "A" in image.getbands() or "transparency" in image.info


def is_current(source: Path, destination: Path) -> bool:
    return destination.exists() and destination.stat().st_mtime >= source.stat().st_mtime


def optimize_static(source: Path, destination: Path, max_size: int = 2400) -> None:
    if not source.exists():
        print(f"skip    {source.name} (no source replacement provided)")
        return
    if is_current(source, destination):
        print(f"current {destination.name}")
        return

    with Image.open(source) as image:
        mode = "RGBA" if has_alpha(image) else "RGB"
        optimized = image.convert(mode)
        optimized.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        optimized.save(destination, "WEBP", quality=86, method=6)

    print(f"static  {source.name} -> {destination.name}")


def optimize_animation(source: Path, destination: Path) -> None:
    if is_current(source, destination):
        print(f"current {destination.name}")
        return

    with Image.open(source) as image:
        frame_count = image.n_frames

    ffmpeg = str(FFMPEG_BINARIES[0]) if FFMPEG_BINARIES else shutil.which("ffmpeg")
    if frame_count > 100 and ffmpeg:
        subprocess.run(
            [
                ffmpeg,
                "-y",
                "-hide_banner",
                "-loglevel",
                "error",
                "-i",
                str(source),
                "-vf",
                "fps=12.5,scale='min(640,iw)':-2:flags=lanczos",
                "-an",
                "-c:v",
                "libwebp_anim",
                "-quality",
                "66",
                "-compression_level",
                "4",
                "-loop",
                "0",
                str(destination),
            ],
            check=True,
        )
        print(f"motion  {source.name} -> {destination.name} ({frame_count} frames)")
        return

    with Image.open(source) as image:
        frame_step = 2 if image.n_frames > 100 else 1
        max_size = (640, 640) if frame_step > 1 else (720, 720)
        frames: list[Image.Image] = []
        durations: list[int] = []
        mode = "RGBA" if has_alpha(image) else "RGB"

        for start in range(0, image.n_frames, frame_step):
            duration = 0
            for index in range(start, min(start + frame_step, image.n_frames)):
                image.seek(index)
                duration += max(int(image.info.get("duration", 40)), 20)

            image.seek(start)
            frame = image.convert(mode)
            frame.thumbnail(max_size, Image.Resampling.LANCZOS)
            frames.append(frame.copy())
            durations.append(duration)

        frames[0].save(
            destination,
            "WEBP",
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
            quality=66 if frame_step > 1 else 80,
            method=0 if frame_step > 1 else 4,
        )

    print(
        f"motion  {source.name} -> {destination.name} "
        f"({image.n_frames} frames, step {frame_step})"
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--featured-source",
        type=Path,
        help="Source image for the featured mech project.",
    )
    args = parser.parse_args()

    for source_name, destination_name in STATIC_ASSETS:
        optimize_static(ASSET_ROOT / source_name, ASSET_ROOT / destination_name)

    if args.featured_source:
        optimize_static(
            args.featured_source,
            ASSET_ROOT / "01-modeling" / "featured-mech.webp",
        )

    spin_folder = ASSET_ROOT / "08-spin"
    for source in sorted(spin_folder.glob("spin-*.gif")):
        optimize_animation(source, source.with_suffix(".webp"))


if __name__ == "__main__":
    main()
