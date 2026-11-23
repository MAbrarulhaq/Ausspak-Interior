import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import PublicationStatus


class CategoryCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=1000)


class CategoryPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    name: str | None = Field(default=None, min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=1000)


class CategoryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str
    description: str | None
    design_count: int = 0  # published designs only


class CategoryRef(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    name: str
    slug: str


class ImageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    image_url: str
    alt_text: str
    display_order: int


class DesignListItem(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    description: str
    style: str | None
    is_demonstration: bool = False
    category: CategoryRef
    cover_image: ImageOut | None
    image_count: int
    is_favourite: bool = False


class DesignDetail(DesignListItem):
    images: list[ImageOut]
    created_at: datetime
    updated_at: datetime


class AdminDesign(DesignDetail):
    publication_status: PublicationStatus


class DesignCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category_id: uuid.UUID
    title: str = Field(min_length=2, max_length=200)
    description: str = Field(min_length=3, max_length=5000)
    style: str | None = Field(default=None, max_length=100)
    is_demonstration: bool = False
    publication_status: PublicationStatus = PublicationStatus.draft


class DesignPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    category_id: uuid.UUID | None = None
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, min_length=3, max_length=5000)
    style: str | None = Field(default=None, max_length=100)
    is_demonstration: bool | None = None
    publication_status: PublicationStatus | None = None


class ImagePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    alt_text: str | None = Field(default=None, max_length=200)
    display_order: int | None = Field(default=None, ge=0, le=1000)
