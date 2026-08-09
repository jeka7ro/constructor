from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    org_id = Column(Integer, nullable=True)

engine = create_engine('sqlite:///:memory:')
Base.metadata.create_all(engine)
SessionLocal = sessionmaker(bind=engine)
db = SessionLocal()

user = User(name='Admin')
db.add(user)
db.commit()

user = db.query(User).first()
db.expunge(user)
user.org_id = 123
db.commit()

user2 = db.query(User).first()
print("Saved org_id:", user2.org_id)
