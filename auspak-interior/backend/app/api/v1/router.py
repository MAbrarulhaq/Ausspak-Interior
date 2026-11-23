from fastapi import APIRouter

from app.api.v1.endpoints import admin_enquiries, admin_gallery, auth, dashboard, notifications, site, users, designs, enquiries, favourites, health, orders, tracking

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(orders.router)
api_router.include_router(tracking.router)
api_router.include_router(designs.router)
api_router.include_router(admin_gallery.router)
api_router.include_router(favourites.router)
api_router.include_router(enquiries.router)
api_router.include_router(admin_enquiries.router)
api_router.include_router(notifications.router)
api_router.include_router(dashboard.router)
api_router.include_router(users.router)
api_router.include_router(site.router)
