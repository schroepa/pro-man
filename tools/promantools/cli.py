from __future__ import annotations

import argparse
import sys
from pathlib import Path

from . import __version__
from .lint import lint_exit_code, lint_vault, render_lint
from .report import render_report_csv, render_report_markdown
from .vault import load_vault


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="promantools",
        description="Read-only ProMan vault tools: reports and lint.",
    )
    parser.add_argument("--version", action="version", version=f"promantools {__version__}")
    sub = parser.add_subparsers(dest="command", required=True)

    report = sub.add_parser("report", help="Overdue, cycle, time, weekly digest")
    report.add_argument("vault", type=Path, help="Path to vault root")
    report.add_argument(
        "--format",
        choices=("md", "csv"),
        default="md",
        help="Output format (default: md)",
    )
    report.add_argument(
        "--as-of",
        dest="as_of",
        metavar="YYYY-MM-DD",
        help="Reference date (default: today)",
    )
    report.add_argument(
        "-o",
        "--output",
        type=Path,
        help="Write to file instead of stdout",
    )

    lint = sub.add_parser("lint", help="Check vault integrity (orphans, keys, wikilinks)")
    lint.add_argument("vault", type=Path, help="Path to vault root")
    lint.add_argument(
        "--strict",
        action="store_true",
        help="Exit 1 on warnings as well as errors",
    )

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        vault = load_vault(args.vault)
    except FileNotFoundError as exc:
        print(str(exc), file=sys.stderr)
        return 2
    except OSError as exc:
        print(f"Vault lesen fehlgeschlagen: {exc}", file=sys.stderr)
        return 2

    if args.command == "report":
        if args.format == "csv":
            text = render_report_csv(vault, args.as_of)
        else:
            text = render_report_markdown(vault, args.as_of)
        if args.output:
            args.output.write_text(text, encoding="utf-8")
            print(f"Wrote {args.output}", file=sys.stderr)
        else:
            sys.stdout.write(text)
        return 0

    if args.command == "lint":
        issues = lint_vault(vault)
        sys.stdout.write(render_lint(issues))
        if args.strict and issues:
            return 1
        return lint_exit_code(issues)

    parser.error(f"Unknown command: {args.command}")
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
