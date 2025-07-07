from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Database configuration - support both single URL and individual components
DATABASE_URL = os.getenv("DATABASE_URL")

if not DATABASE_URL:
    # Build URL from individual components (for Docker)
    DATABASE_HOST = os.getenv("DATABASE_HOST", "localhost")
    DATABASE_PORT = os.getenv("DATABASE_PORT", "3307")
    DATABASE_NAME = os.getenv("DATABASE_NAME", "hotel_booking")
    DATABASE_USER = os.getenv("DATABASE_USER", "hotel_user")
    DATABASE_PASSWORD = os.getenv("DATABASE_PASSWORD", "hotel_password")
    
    DATABASE_URL = f"mysql+pymysql://{DATABASE_USER}:{DATABASE_PASSWORD}@{DATABASE_HOST}:{DATABASE_PORT}/{DATABASE_NAME}"

# Create SQLAlchemy engine
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_recycle=300,
    echo=os.getenv("DEBUG", "false").lower() == "true"  # SQL logging in debug mode
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create Base class
Base = declarative_base()

# Dependency to get DB session
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close() 