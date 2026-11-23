import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api.v1.router import api_router
from app.core.config import get_settings

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("auspak")

settings = get_settings()
app = FastAPI(
    title="Auspak Interior API",
    version="1.0.0",
    description="Backend for Auspak Interior: order tracking, design gallery, enquiries, notifications and admin tools.",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type", "Authorization", "X-Enquiry-Token"],
)


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    """Readable validation errors. Submitted values are never echoed back (they may include passwords)."""
    items = []
    for e in exc.errors():
        loc = [str(p) for p in e.get("loc", []) if p not in ("body", "query", "form")]
        items.append({"field": ".".join(loc), "msg": str(e.get("msg", "Invalid value")).removeprefix("Value error, ")})
    return JSONResponse(status_code=422, content={"detail": items})


@app.exception_handler(Exception)
async def unhandled_handler(request: Request, exc: Exception):
    log.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(status_code=500, content={"detail": "Internal server error."})


app.include_router(api_router)

# Public files only (design images). Private reference uploads live in storage/private and are never mounted.
(settings.storage_path / "public").mkdir(parents=True, exist_ok=True)
app.mount(settings.MEDIA_URL, StaticFiles(directory=settings.storage_path / "public"), name="media")


@app.get("/", include_in_schema=False)
def root() -> dict:
    return {"service": "Auspak Interior API", "docs": "/docs", "health": "/api/v1/health"}
