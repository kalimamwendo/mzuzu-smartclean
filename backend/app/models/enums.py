from enum import StrEnum


class UserRole(StrEnum):
    CITIZEN = "citizen"
    FIELD_OFFICER = "field_officer"
    ADMIN = "admin"


class AccountStatus(StrEnum):
    ACTIVE = "active"
    SUSPENDED = "suspended"


class ReportStatus(StrEnum):
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    VERIFIED = "verified"
    RESOLVED = "resolved"
    REJECTED = "rejected"


class BoundaryStatus(StrEnum):
    UNAVAILABLE = "unavailable"
    INSIDE = "inside"
    OUTSIDE = "outside"
    PENDING = "pending"
