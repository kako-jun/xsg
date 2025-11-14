#!/usr/bin/env python3
"""
Migration CLI Tool

Convert legacy pg files to XSG pattern format.

Usage:
    python migrate.py input.json output.yaml
    python migrate.py --directory legacy_patterns/ --output patterns/
"""

import argparse
import sys
from pathlib import Path

from app.migration import migrate_pattern_file, MigrationError


def main():
    parser = argparse.ArgumentParser(
        description="Migrate legacy pg files to XSG format"
    )
    parser.add_argument("input", nargs="?", help="Input legacy JSON file")
    parser.add_argument("output", nargs="?", help="Output XSG YAML file")
    parser.add_argument(
        "--directory",
        "-d",
        help="Migrate all JSON files in directory",
    )
    parser.add_argument(
        "--output-dir",
        "-o",
        help="Output directory (for --directory mode)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Show what would be migrated without writing files",
    )

    args = parser.parse_args()

    # Single file mode
    if args.input and args.output:
        try:
            if args.dry_run:
                print(f"[DRY RUN] Would migrate: {args.input} → {args.output}")
            else:
                migrate_pattern_file(args.input, args.output)
        except MigrationError as e:
            print(f"✗ Migration failed: {e}", file=sys.stderr)
            sys.exit(1)
        except Exception as e:
            print(f"✗ Error: {e}", file=sys.stderr)
            sys.exit(1)

    # Directory mode
    elif args.directory:
        input_dir = Path(args.directory)
        output_dir = Path(args.output_dir) if args.output_dir else input_dir

        if not input_dir.exists():
            print(f"✗ Directory not found: {input_dir}", file=sys.stderr)
            sys.exit(1)

        # Find all JSON files
        json_files = list(input_dir.glob("**/*.json"))

        if not json_files:
            print(f"No JSON files found in {input_dir}")
            return

        print(f"Found {len(json_files)} JSON files")
        print()

        # Migrate each file
        success_count = 0
        error_count = 0

        for json_file in json_files:
            # Determine output path
            relative_path = json_file.relative_to(input_dir)
            yaml_file = output_dir / relative_path.with_suffix(".yaml")

            try:
                if args.dry_run:
                    print(f"[DRY RUN] Would migrate: {json_file} → {yaml_file}")
                    success_count += 1
                else:
                    # Create output directory if needed
                    yaml_file.parent.mkdir(parents=True, exist_ok=True)

                    # Migrate
                    migrate_pattern_file(str(json_file), str(yaml_file))
                    success_count += 1

            except MigrationError as e:
                print(f"✗ {json_file}: {e}", file=sys.stderr)
                error_count += 1
            except Exception as e:
                print(f"✗ {json_file}: {e}", file=sys.stderr)
                error_count += 1

        print()
        print(f"✓ Migrated: {success_count} files")
        if error_count > 0:
            print(f"✗ Failed: {error_count} files")
            sys.exit(1)

    else:
        parser.print_help()
        sys.exit(1)


if __name__ == "__main__":
    main()
