"""Command line tools.  Run from the backend folder:

  python -m app.cli create-admin --email owner@example.com --name "Owner Name"
  python -m app.cli create-admin --email staff@example.com --name "Staff" --role staff

The password is asked interactively (hidden). For scripts you can set ADMIN_PASSWORD instead."""
import argparse
import getpass
import os
import sys

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import select

from app.core.security import hash_password
from app.db.session import SessionLocal
from app.models.enums import UserRole
from app.models.user import User


def create_admin(email: str, name: str, role: str, password: str | None) -> int:
    try:  # same validation as the API, so an account created here can always log in
        email = TypeAdapter(EmailStr).validate_python(email.strip()).lower()
    except ValidationError as exc:
        print(f"Invalid email address: {exc.errors()[0]['msg']}", file=sys.stderr)
        return 1
    password = password or os.environ.get("ADMIN_PASSWORD") or getpass.getpass("Password (min 10 characters): ")
    if len(password) < 10:
        print("Password must be at least 10 characters.", file=sys.stderr)
        return 1
    with SessionLocal() as db:
        if db.scalar(select(User).where(User.email == email)):
            print(f"A user with email {email} already exists.", file=sys.stderr)
            return 1
        db.add(User(full_name=name.strip(), email=email, password_hash=hash_password(password), role=UserRole(role)))
        db.commit()
    print(f"Created {role} account for {email}.")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(prog="app.cli")
    sub = parser.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("create-admin", help="Create an admin or staff account")
    p.add_argument("--email", required=True)
    p.add_argument("--name", required=True)
    p.add_argument("--role", choices=["admin", "staff"], default="admin")
    p.add_argument("--password", help="Avoid this on shared machines (it stays in shell history). Prefer the prompt.")
    args = parser.parse_args()
    return create_admin(args.email, args.name, args.role, args.password)


if __name__ == "__main__":
    raise SystemExit(main())
