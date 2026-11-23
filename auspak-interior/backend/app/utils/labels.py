from app.models.enums import OrderStatus

STATUS_LABELS = {
    OrderStatus.order_received: "Order Received",
    OrderStatus.designing: "Designing",
    OrderStatus.in_progress: "In Progress",
    OrderStatus.ready_for_collection: "Ready for Collection",
    OrderStatus.completed: "Completed",
}
