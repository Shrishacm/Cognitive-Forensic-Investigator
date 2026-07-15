from backend.database import engine, Base
from backend import models

# Creates User and CaseAccess tables
# without dropping existing tables
Base.metadata.create_all(bind=engine)
print("Auth tables created successfully")
