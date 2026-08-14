from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# SQLite database file will be created in the root directory
SQLALCHEMY_DATABASE_URL = "sqlite:///./taskflow.db"

# connect_args={"check_same_thread": False} is needed only for SQLite in FastAPI
engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

# Dependency to reuse the database session across endpoints
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()