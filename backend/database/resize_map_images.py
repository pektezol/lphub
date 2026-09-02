#!/usr/bin/env python3
"""Re-encode one game's map images as 1280x720 JPEG data URLs.

The ``maps.image`` column contains browser data URLs such as
``data:image/png;base64,...``.  This script decodes each non-empty image,
resizes it to exactly 1280x720, encodes it as an optimized JPEG, and writes it
back as ``data:image/jpeg;base64,...``.

Dependencies:
    python3 -m pip install Pillow "psycopg[binary]"

Examples:
    # Inspect the expected reduction without changing the database.
    python3 backend/database/resize_map_images.py --game-id 3

    # Perform the update after reviewing the dry-run output.
    python3 backend/database/resize_map_images.py --game-id 3 --apply

Database settings are read from the environment.  By default, missing values
are also loaded from backend/.env, matching the Go backend.  DATABASE_URL is
supported as an alternative to DB_HOST, DB_PORT, DB_USER, DB_PASS, and DB_NAME.
"""

from __future__ import annotations

import argparse
import base64
import binascii
import io
import os
import sys
from pathlib import Path
from typing import Any

from PIL import Image, ImageOps, UnidentifiedImageError

TARGET_SIZE = (800, 450)
JPEG_MIME_TYPE = "image/jpeg"
DEFAULT_QUALITY = 70
DEFAULT_ENV_FILE = Path(__file__).resolve().parents[1] / ".env"


def parse_arguments() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Resize one game's maps.image values to 1280x720 JPEG data URLs."
    )
    parser.add_argument(
        "--game-id",
        type=positive_integer,
        required=True,
        help="ID of the game whose map images should be processed.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write the converted images. Without this flag, no rows are changed.",
    )
    parser.add_argument(
        "--quality",
        type=jpeg_quality,
        default=DEFAULT_QUALITY,
        help=f"JPEG quality from 1 to 95 (default: {DEFAULT_QUALITY}).",
    )
    parser.add_argument(
        "--env-file",
        type=Path,
        default=DEFAULT_ENV_FILE,
        metavar="PATH",
        help="Optional dotenv file used only for DB_* values missing from the environment.",
    )
    return parser.parse_args()


def positive_integer(value: str) -> int:
    try:
        number = int(value)
    except ValueError as error:
        raise argparse.ArgumentTypeError("must be an integer") from error
    if number <= 0:
        raise argparse.ArgumentTypeError("must be greater than zero")
    return number


def jpeg_quality(value: str) -> int:
    quality = positive_integer(value)
    if quality > 95:
        raise argparse.ArgumentTypeError("must be between 1 and 95")
    return quality


def load_missing_environment_values(path: Path) -> None:
    """Load simple KEY=VALUE entries without overriding exported environment values."""
    if not path.is_file():
        return

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if line.startswith("export "):
            line = line.removeprefix("export ").lstrip()
        key, separator, value = line.partition("=")
        if not separator or not key:
            continue

        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in {"'", '"'}:
            value = value[1:-1]
        os.environ.setdefault(key.strip(), value)


def database_connection() -> Any:
    """Connect with psycopg 3 when available, or psycopg2 as a fallback."""
    try:
        import psycopg  # type: ignore[import-not-found]
    except ImportError:
        try:
            import psycopg2 as psycopg  # type: ignore[import-not-found]
        except ImportError as error:
            raise RuntimeError(
                "A PostgreSQL driver is required. Install one with: "
                'python3 -m pip install "psycopg[binary]"'
            ) from error

    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return psycopg.connect(database_url)

    required = ("DB_HOST", "DB_USER", "DB_PASS", "DB_NAME")
    missing = [name for name in required if not os.getenv(name)]
    if missing:
        raise RuntimeError(
            "Missing database configuration: " + ", ".join(missing) + ". "
            "Set DATABASE_URL or the DB_* variables."
        )

    return psycopg.connect(
        host=os.environ["DB_HOST"],
        port=os.getenv("DB_PORT", "5432"),
        user=os.environ["DB_USER"],
        password=os.environ["DB_PASS"],
        dbname=os.environ["DB_NAME"],
        # This matches backend/database/database.go. Set DB_SSLMODE to override it.
        sslmode=os.getenv("DB_SSLMODE", "disable"),
    )


def decode_image_value(value: str) -> bytes:
    """Decode either a base64 data URL or a bare base64 image string."""
    value = value.strip()
    if value.lower().startswith("data:"):
        header, separator, encoded = value.partition(",")
        if not separator or ";base64" not in header.lower():
            raise ValueError("image is a data URL, but not a base64 data URL")
    else:
        encoded = value

    try:
        # Whitespace is valid in base64 and may be present in manually inserted values.
        return base64.b64decode("".join(encoded.split()), validate=True)
    except (binascii.Error, ValueError) as error:
        raise ValueError("image does not contain valid base64 data") from error


def convert_to_jpeg_data_url(value: str, quality: int) -> str:
    """Decode, normalize, resize, and encode one map image."""
    image_bytes = decode_image_value(value)

    try:
        with Image.open(io.BytesIO(image_bytes)) as source:
            source.load()
            image = ImageOps.exif_transpose(source)

            # JPEG cannot store alpha. Composite transparent images over black so their
            # visible pixels remain predictable after conversion.
            if "A" in image.getbands() or "transparency" in image.info:
                rgba = image.convert("RGBA")
                rgb = Image.new("RGB", rgba.size, "black")
                rgb.paste(rgba, mask=rgba.getchannel("A"))
            else:
                rgb = image.convert("RGB")

            resized = rgb.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
            output = io.BytesIO()
            resized.save(
                output,
                format="JPEG",
                quality=quality,
                optimize=True,
                progressive=True,
                subsampling="4:2:0",
            )
    except (OSError, UnidentifiedImageError) as error:
        raise ValueError("image cannot be decoded by Pillow") from error

    encoded = base64.b64encode(output.getvalue()).decode("ascii")
    return f"data:{JPEG_MIME_TYPE};base64,{encoded}"


def format_size(size: int) -> str:
    """Format the stored text length for human-readable dry-run output."""
    units = ("B", "KiB", "MiB", "GiB")
    amount = float(size)
    for unit in units:
        if amount < 1024 or unit == units[-1]:
            return f"{amount:.1f} {unit}"
        amount /= 1024
    raise AssertionError("unreachable")


def resize_game_images(connection: Any, game_id: int, quality: int, apply: bool) -> int:
    """Convert all non-empty map images for one game in one all-or-nothing transaction."""
    connection.autocommit = False
    failures: list[tuple[int, str]] = []
    processed = 0
    skipped = 0
    original_total = 0
    converted_total = 0

    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT name FROM games WHERE id = %s", (game_id,))
            game = cursor.fetchone()
            if game is None:
                raise RuntimeError(f"No game exists with id {game_id}.")

            cursor.execute(
                "SELECT id FROM maps WHERE game_id = %s ORDER BY id", (game_id,)
            )
            map_ids = [row[0] for row in cursor.fetchall()]
            print(f"Game {game_id} ({game[0]}): {len(map_ids)} map(s) found.")

            for map_id in map_ids:
                # Lock each row before reading and updating it. This prevents a concurrent
                # map-image edit from being silently overwritten during this migration.
                lock_clause = " FOR UPDATE" if apply else ""
                cursor.execute(
                    "SELECT image FROM maps WHERE id = %s AND game_id = %s"
                    + lock_clause,
                    (map_id, game_id),
                )
                row = cursor.fetchone()
                if row is None:
                    failures.append(
                        (map_id, "map disappeared or changed games during processing")
                    )
                    continue

                image_value = row[0]
                if not image_value or not image_value.strip():
                    skipped += 1
                    continue

                original_size = len(image_value.encode("utf-8"))
                try:
                    converted_value = convert_to_jpeg_data_url(image_value, quality)
                except (
                    Exception
                ) as error:  # Keep processing so all invalid map IDs are reported.
                    failures.append((map_id, str(error)))
                    continue

                converted_size = len(converted_value.encode("utf-8"))
                original_total += original_size
                converted_total += converted_size
                processed += 1
                reduction = 100 * (1 - converted_size / original_size)
                print(
                    f"  map {map_id}: {format_size(original_size)} -> "
                    f"{format_size(converted_size)} ({reduction:+.1f}%)"
                )

                if apply:
                    cursor.execute(
                        "UPDATE maps SET image = %s WHERE id = %s AND game_id = %s",
                        (converted_value, map_id, game_id),
                    )
                    if cursor.rowcount != 1:
                        failures.append((map_id, "map was not updated"))

        if failures:
            connection.rollback()
            print(
                "\nNo rows were changed because one or more maps could not be processed:",
                file=sys.stderr,
            )
            for map_id, reason in failures:
                print(f"  map {map_id}: {reason}", file=sys.stderr)
            return 1

        if apply:
            connection.commit()
        else:
            connection.rollback()
    except Exception:
        connection.rollback()
        raise

    print()
    print(f"Processed: {processed}; skipped empty images: {skipped}.")
    print(
        f"Stored image text: {format_size(original_total)} -> {format_size(converted_total)}"
    )
    if original_total:
        reduction = 100 * (1 - converted_total / original_total)
        print(f"Total reduction: {reduction:+.1f}%")
    if apply:
        print("Changes committed.")
    else:
        print("Dry run only; no rows were changed. Re-run with --apply to commit.")
    return 0


def main() -> int:
    args = parse_arguments()
    load_missing_environment_values(args.env_file)

    try:
        connection = database_connection()
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1

    try:
        return resize_game_images(connection, args.game_id, args.quality, args.apply)
    except Exception as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 1
    finally:
        connection.close()


if __name__ == "__main__":
    raise SystemExit(main())
