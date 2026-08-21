from app.models.base import Base
from app.models.user import User, UserVerification, UserDevice, UserSession
from app.models.property import (
    Property, Building, Floor, Room, RoomAmenity,
    PropertyNearbyPlace, PropertyHistory,
)
from app.models.media import (
    VerificationPhoto, PhotoMetadata,
    WalkthroughVideo, MediaAuditLog,
)
from app.models.booking import Booking, BookingCheckIn, QRCode
from app.models.review import Review, ReviewCategory, ReviewMedia, PropertyHealthScore
from app.models.scam import ScamReport, ScamReportMedia, FraudHit, OwnerTrustScore
from app.models.payment import (
    Payment, MpesaTransaction, PremiumSubscription,
    Invoice, Payout,
)
from app.models.ads import AdCampaign, AdImpression, AdClick, FeaturedListing
from app.models.analytics import (
    PropertyView, PropertyClick, PropertyCall, PropertyWhatsAppClick,
    OwnerAnalytics, SearchLog,
)
from app.models.chat import ChatMessage, ChatConversation
from app.models.university import University, Campus
from app.models.notification import Notification, NotificationPreference
from app.models.trust import (
    PropertyService, PropertyServiceStatus, PropertyRecommendation,
    PropertyBlacklist, BlacklistState, PropertyAppeal,
    AuditLog, Favorite, OTPCode,
)
