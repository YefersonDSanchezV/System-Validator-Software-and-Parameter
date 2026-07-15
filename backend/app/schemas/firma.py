from pydantic import BaseModel, ConfigDict


class FirmaBase(BaseModel):
    firma: str


class FirmaCreate(FirmaBase):
    pass


class FirmaResponse(FirmaBase):
    oid: int

    model_config = ConfigDict(from_attributes=True)
