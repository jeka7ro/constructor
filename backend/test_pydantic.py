from pydantic import BaseModel, Field, EmailStr, model_validator
from typing import Optional

class TestModel(BaseModel):
    name: str
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    age: Optional[int] = None

    @model_validator(mode='before')
    @classmethod
    def clean_empty_strings(cls, values):
        if isinstance(values, dict):
            for k, v in list(values.items()):
                if isinstance(v, str):
                    stripped = v.strip()
                    if stripped == "":
                        values[k] = None
                    else:
                        values[k] = stripped
        return values

try:
    m1 = TestModel(name="John", email="")
    print("M1:", m1.model_dump())
    
    m2 = TestModel(name="John", email="   ", phone="  123 ")
    print("M2:", m2.model_dump())
    
    m3 = TestModel(name="   ", age="")
    print("M3:", m3.model_dump())
except Exception as e:
    print("Error:", e)

