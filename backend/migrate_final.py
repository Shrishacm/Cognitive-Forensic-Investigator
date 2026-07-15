from backend.database import engine, Base
from backend import models
# Creates any missing tables
Base.metadata.create_all(bind=engine)
print("All tables verified/created")
