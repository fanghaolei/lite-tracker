#!/usr/bin/env python3
"""One-command local setup for Lite Tracker."""

from __future__ import annotations

import os
import subprocess
import sys
import venv
from pathlib import Path


ROOT = Path(__file__).resolve().parent
VENV_DIR = ROOT / ".venv"


def main() -> int:
    python = create_venv()
    print(f"Using Python: {python}")

    install_python_dependencies(python)
    install_node_dependencies()
    initialize_database(python)
    build_frontend()

    print("\nSetup complete.")
    print("Database: lite-tracker.db")
    print("App URL:  http://127.0.0.1:8000")
    print("\nStarting Lite Tracker...")
    run([str(python), "main.py"])
    return 0


def create_venv() -> Path:
    ensure_not_running_inside_venv()
    if VENV_DIR.exists():
        raise RuntimeError(
            f"{VENV_DIR} already exists.\n"
            "Exit any active virtual environment, remove or rename the existing .venv yourself, "
            "then rerun setup_app.py."
        )

    print(f"Creating virtual environment: {VENV_DIR}")
    venv.EnvBuilder(with_pip=True).create(VENV_DIR)
    return venv_python_path()


def ensure_not_running_inside_venv() -> None:
    in_venv = sys.prefix != sys.base_prefix or bool(os.environ.get("VIRTUAL_ENV"))
    if in_venv:
        raise RuntimeError(
            "A Python virtual environment is already active.\n"
            "Exit it first, then rerun setup_app.py so the helper can create a clean local .venv."
        )


def venv_python_path() -> Path:
    if os.name == "nt":
        return VENV_DIR / "Scripts" / "python.exe"
    return VENV_DIR / "bin" / "python"


def install_python_dependencies(python: Path) -> None:
    run([str(python), "-m", "pip", "install", "--upgrade", "pip"])
    run([str(python), "-m", "pip", "install", "-r", "requirements.txt"])


def install_node_dependencies() -> None:
    run([find_npm(), "install"])


def build_frontend() -> None:
    run([find_npm(), "run", "build"])


def initialize_database(python: Path) -> None:
    script = (
        "from app.core.database import Base, DB_PATH, engine; "
        "from app import models; "
        "Base.metadata.create_all(bind=engine); "
        "print(f'Initialized SQLite schema at {DB_PATH}')"
    )
    run([str(python), "-c", script])


def find_npm() -> str:
    candidates = ["npm.cmd", "npm"] if os.name == "nt" else ["npm"]
    for candidate in candidates:
        found = shutil.which(candidate)
        if found:
            return found

    windows_default = Path("C:/Program Files/nodejs/npm.cmd")
    if os.name == "nt" and windows_default.exists():
        return str(windows_default)

    raise RuntimeError("npm was not found. Install Node.js 20 LTS or newer, then rerun setup.")


def run(command: list[str]) -> None:
    print(f"\n> {' '.join(command)}")
    subprocess.run(command, cwd=ROOT, check=True, env=command_env(command))


def command_env(command: list[str]) -> dict[str, str]:
    env = os.environ.copy()
    executable = Path(command[0])
    if executable.name.lower() in {"npm", "npm.cmd"}:
        node_dir = executable.parent
        if node_dir.exists():
            env["PATH"] = f"{node_dir}{os.pathsep}{env.get('PATH', '')}"
    return env


if __name__ == "__main__":
    raise SystemExit(main())
