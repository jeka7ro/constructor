with open("app/models.py", "a") as f:
    f.write("""
class Expense(Base):
    __tablename__ = "expenses"

    id = Column(String(36), primary_key=True, default=generate_uuid)
    organization_id = Column(String(36), ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False)
    site_id = Column(String(36), ForeignKey("construction_sites.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(String(36), ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    category = Column(String(50), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="RON")
    date = Column(Date, nullable=False)
    description = Column(Text, nullable=True)
    document_url = Column(String(255), nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
""")
