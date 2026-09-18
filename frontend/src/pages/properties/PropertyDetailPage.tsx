import { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesApi, bookingsApi, analyticsApi, favoritesApi, chatApi, reviewsApi, reportsApi, roomsApi } from '@/lib/api';
import VerificationPanel from '@/components/VerificationPanel';
import { useAuthStore } from '@/store/authStore';
import { formatCurrency, formatTimeAgo } from '@/lib/utils';
import {
  MapPin, Home, Shield, Star, Clock, Users, ChevronLeft,
  Calendar, Share2, Bookmark, Flag, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function PropertyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuthStore();
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('');
  const [selectedRoomId, setSelectedRoomId] = useState<string>('');
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [reportReason, setReportReason] = useState('');
  const [reportDesc, setReportDesc] = useState('');
  const [showReport, setShowReport] = useState(false);

  const { data: property, isLoading } = useQuery({
    queryKey: ['property', id],
    queryFn: () => propertiesApi.get(id!),
    enabled: !!id,
  });

  const { data: favStatus } = useQuery({
    queryKey: ['favorite-status', id],
    queryFn: () => favoritesApi.status(id!),
    enabled: !!id && isAuthenticated,
  });

  const { data: reviewsData, refetch: refetchReviews } = useQuery({
    queryKey: ['reviews', id],
    queryFn: () => reviewsApi.list(id!),
    enabled: !!id,
  });

  useEffect(() => {
    if (id) {
      analyticsApi.trackView(id).catch(() => {});
    }
  }, [id]);

  const bookingMutation = useMutation({
    mutationFn: (data: any) => bookingsApi.create(data),
    onSuccess: () => {
      toast.success('Booking request sent!');
      setShowBookingForm(false);
      analyticsApi.trackClick(id!, 'book').catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['my-bookings'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Booking failed');
    },
  });

  const favMutation = useMutation({
    mutationFn: async () => {
      if (isFav) {
        await favoritesApi.remove(id!);
      } else {
        await favoritesApi.add(id!);
      }
    },
    onSuccess: () => {
      toast.success(isFav ? 'Removed from saved' : 'Saved to favorites');
      queryClient.invalidateQueries({ queryKey: ['favorite-status', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Could not update favorites'),
  });

  const chatMutation = useMutation({
    mutationFn: () => chatApi.startConversation({ property_id: id }),
    onSuccess: () => {
      analyticsApi.trackClick(id!, 'contact').catch(() => {});
      navigate('/messages');
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Could not start conversation'),
  });

  const reviewMutation = useMutation({
    mutationFn: () => reviewsApi.create(id!, { overall_rating: reviewRating, comment: reviewComment }),
    onSuccess: () => {
      toast.success('Review submitted');
      setReviewComment('');
      refetchReviews();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Review failed'),
  });

  const reportMutation = useMutation({
    mutationFn: () => reportsApi.create(id!, { report_category: reportReason, description: reportDesc || 'Reported from property page' }),
    onSuccess: () => {
      toast.success('Report submitted. Thank you.');
      setShowReport(false);
      setReportReason('');
      setReportDesc('');
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Report failed'),
  });

  const roomToggleMutation = useMutation({
    mutationFn: ({ roomId, occupied }: { roomId: string; occupied: boolean }) =>
      occupied ? roomsApi.markOccupied(roomId) : roomsApi.markVacant(roomId),
    onSuccess: () => {
      toast.success('Room updated');
      queryClient.invalidateQueries({ queryKey: ['property', id] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Room update failed'),
  });

  const handleBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error('Please login to book a viewing');
      return;
    }

    const [hh, mm] = bookingTime.split(':').map(Number);
    const endH = (hh + 1) % 24;
    const endStr = `${String(endH).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
    bookingMutation.mutate({
      property_id: id,
      room_id: selectedRoomId || undefined,
      scheduled_date: `${bookingDate}T${bookingTime}:00`,
      scheduled_time_start: `${bookingDate}T${bookingTime}:00`,
      scheduled_time_end: `${bookingDate}T${endStr}:00`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const prop = property?.data;

  if (!prop) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-4">Property not found</h2>
        <Link to="/properties" className="text-primary hover:underline">
          Browse properties
        </Link>
      </div>
    );
  }

  const isFav = !!favStatus?.data?.is_favorite;
  const isOwnerView = isAuthenticated && user && (user.id === prop.owner?.id || ['owner', 'caretaker', 'agent', 'host', 'manager'].includes(user.role || ''));
  const rooms = useMemo(
    () => (prop.buildings || []).flatMap((b: any) => (b.floors || []).flatMap((f: any) => (f.rooms || []).map((r: any) => ({ ...r, building_name: b.building_name })))),
    [prop],
  );
  const reviews = reviewsData?.data?.reviews ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <Link
        to="/properties"
        className="inline-flex items-center text-sm text-gray-600 hover:text-primary mb-6"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to properties
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-gray-200 rounded-xl h-80 flex items-center justify-center overflow-hidden">
            {prop.photos?.[0]?.url ? (
              <img src={prop.photos[0].url} alt={prop.property_name} className="h-full w-full object-cover" />
            ) : (
              <Home className="h-16 w-16 text-gray-400" />
            )}
          </div>

          <div>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">{prop.property_name}</h1>
                <div className="flex items-center text-gray-600">
                  <MapPin className="h-4 w-4 mr-1" />
                  {prop.address_line1}, {prop.city}, {prop.county}
                </div>
              </div>
              <div className="flex space-x-2">
                <button
                  title="Share"
                  onClick={() => {
                    const url = window.location.href;
                    navigator.clipboard?.writeText(url).then(
                      () => toast.success('Link copied'),
                      () => toast.error('Could not copy link'),
                    );
                  }}
                  className="p-2 rounded-lg border hover:bg-gray-50"
                >
                  <Share2 className="h-5 w-5" />
                </button>
                <button
                  title={isFav ? 'Remove from saved' : 'Save'}
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error('Login to save properties');
                      navigate('/login');
                      return;
                    }
                    favMutation.mutate();
                  }}
                  className={`p-2 rounded-lg border hover:bg-gray-50 ${isFav ? 'text-primary' : ''}`}
                >
                  <Bookmark className={`h-5 w-5 ${isFav ? 'fill-current' : ''}`} />
                </button>
                <button
                  title="Report"
                  onClick={() => {
                    if (!isAuthenticated) {
                      toast.error('Login to report');
                      navigate('/login');
                      return;
                    }
                    setShowReport((s) => !s);
                  }}
                  className="p-2 rounded-lg border hover:bg-gray-50 text-red-500"
                >
                  <Flag className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 mt-2">
              {prop.has_verified_photos && (
                <span className="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  <Shield className="h-3 w-3 mr-1" />
                  Photos Verified
                </span>
              )}
              {prop.status === 'verified' && (
                <span className="inline-flex items-center text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                  <Star className="h-3 w-3 mr-1" />
                  Verified Property
                </span>
              )}
            </div>
          </div>

          {showReport && (
            <div className="border rounded-xl p-4 space-y-3 bg-red-50/40">
              <h3 className="font-semibold">Report this property</h3>
              <select value={reportReason} onChange={(e) => setReportReason(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="">Select a reason</option>
                <option value="fake_property">Fake property</option>
                <option value="fake_photos">Fake photos</option>
                <option value="wrong_location">Wrong location</option>
                <option value="wrong_rent">Wrong price</option>
                <option value="owner_fraud">Fraud / scam</option>
                <option value="misleading_description">Misleading info</option>
                <option value="unsafe_property">Unsafe</option>
                <option value="other">Other</option>
              </select>
              <textarea value={reportDesc} onChange={(e) => setReportDesc(e.target.value)} placeholder="Details (optional)" className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
              <button disabled={!reportReason || reportMutation.isPending} onClick={() => reportMutation.mutate()} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                {reportMutation.isPending ? 'Submitting...' : 'Submit report'}
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="text-center">
              <Home className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{prop.total_rooms}</div>
              <div className="text-xs text-gray-600">Total Rooms</div>
            </div>
            <div className="text-center">
              <Users className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{prop.vacant_rooms}</div>
              <div className="text-xs text-gray-600">Vacant Rooms</div>
            </div>
            <div className="text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{Math.round(prop.occupancy_rate)}%</div>
              <div className="text-xs text-gray-600">Occupancy</div>
            </div>
            <div className="text-center">
              <Star className="h-5 w-5 mx-auto mb-1 text-primary" />
              <div className="text-lg font-bold">{prop.total_views}</div>
              <div className="text-xs text-gray-600">Views</div>
            </div>
          </div>

          {prop.description && (
            <div>
              <h2 className="text-xl font-semibold mb-3">About This Property</h2>
              <p className="text-gray-600 leading-relaxed">{prop.description}</p>
            </div>
          )}

          {prop.buildings && prop.buildings.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Buildings & Rooms</h2>
              <div className="space-y-4">
                {prop.buildings.map((building: any) => (
                  <div key={building.id} className="border rounded-xl p-4">
                    <h3 className="font-semibold">{building.building_name}</h3>
                    <p className="text-sm text-gray-600 mb-3">
                      {(building.total_rooms ?? building.floors?.reduce((n: number, f: any) => n + (f.rooms?.length ?? 0), 0) ?? 0)} rooms
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {(building.floors || []).flatMap((f: any) => f.rooms || []).map((r: any) => (
                        <div
                          key={r.id}
                          className={`border rounded-lg p-3 text-sm ${selectedRoomId === r.id ? 'border-primary bg-primary/5' : ''}`}
                        >
                          <button
                            onClick={() => setSelectedRoomId(r.id === selectedRoomId ? '' : r.id)}
                            className="text-left w-full"
                          >
                            <div className="font-semibold">{r.room_number} · {(r.house_type || '').replace(/_/g, ' ')}</div>
                            <div className="text-primary font-bold">{formatCurrency(r.rent_amount)}/mo</div>
                            <div className="text-xs text-gray-500 capitalize">{r.occupancy_status}</div>
                          </button>
                          {isOwnerView && (
                            <button
                              onClick={() => roomToggleMutation.mutate({ roomId: r.id, occupied: r.occupancy_status === 'vacant' })}
                              className="mt-2 text-xs px-2 py-1 border rounded-lg hover:bg-gray-50"
                            >
                              Mark {r.occupancy_status === 'vacant' ? 'occupied' : 'vacant'}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {prop.photos?.length > 1 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Photos</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {prop.photos.slice(1).map((ph: any) => (
                  <img key={ph.id} src={ph.url} alt={ph.caption || 'Property photo'} className="h-40 w-full object-cover rounded-lg" loading="lazy" />
                ))}
              </div>
            </div>
          )}

          {prop.nearby_places && prop.nearby_places.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Nearby Places</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {prop.nearby_places.map((place: any, idx: number) => (
                  <div key={idx} className="flex items-center space-x-2 text-sm">
                    <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{place.name || place.place_name} ({place.distance_km}km)</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h2 className="text-xl font-semibold mb-3">Reviews ({reviewsData?.data?.total ?? reviews.length})</h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-gray-500">No reviews yet. Be the first to review.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map((r: any) => (
                  <div key={r.id} className="border rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-sm">{r.tenant_name}</p>
                      <span className="text-sm text-yellow-600">★ {r.overall_rating}</span>
                    </div>
                    {r.title && <p className="text-sm font-medium mt-1">{r.title}</p>}
                    {r.comment && <p className="text-sm text-gray-600 mt-1">{r.comment}</p>}
                  </div>
                ))}
              </div>
            )}
            {isAuthenticated ? (
              <div className="mt-4 border rounded-xl p-4 space-y-3">
                <h3 className="font-semibold text-sm">Write a review</h3>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setReviewRating(n)} className={`text-2xl ${n <= reviewRating ? 'text-yellow-500' : 'text-gray-300'}`}>★</button>
                  ))}
                </div>
                <textarea value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} placeholder="What did you like?" className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} />
                <button disabled={reviewMutation.isPending} onClick={() => reviewMutation.mutate()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50">
                  {reviewMutation.isPending ? 'Submitting...' : 'Submit review'}
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 mt-3"><Link to="/login" className="text-primary hover:underline">Login</Link> to write a review.</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl border p-6 sticky top-24">
            <div className="text-3xl font-bold text-primary mb-1">
              {formatCurrency(prop.min_rent || 0)}
              {prop.max_rent && prop.max_rent !== prop.min_rent
                ? ` - ${formatCurrency(prop.max_rent)}`
                : ''}
              <span className="text-sm text-gray-500 font-normal">/month</span>
            </div>

            {prop.last_vacancy_update && (
              <p className="text-xs text-gray-500 mb-4">
                Updated {formatTimeAgo(prop.last_vacancy_update)}
              </p>
            )}

            {selectedRoomId && (
              <p className="text-xs text-primary font-semibold mb-2">
                Selected room: {rooms.find((r: any) => r.id === selectedRoomId)?.room_number}
              </p>
            )}

            {isAuthenticated ? (
              showBookingForm ? (
                <form onSubmit={handleBooking} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Date</label>
                    <input
                      type="date"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Time</label>
                    <input
                      type="time"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      required
                    />
                  </div>
                  {rooms.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-1">Room (optional)</label>
                      <select value={selectedRoomId} onChange={(e) => setSelectedRoomId(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                        <option value="">Any vacant room</option>
                        {rooms.filter((r: any) => r.occupancy_status === 'vacant').map((r: any) => (
                          <option key={r.id} value={r.id}>{r.room_number} · {formatCurrency(r.rent_amount)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <button
                      type="submit"
                      disabled={bookingMutation.isPending}
                      className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
                    >
                      {bookingMutation.isPending ? 'Sending...' : 'Confirm Booking'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowBookingForm(false)}
                      className="px-4 py-3 border rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowBookingForm(true)}
                    className="w-full py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90"
                  >
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Book Viewing
                  </button>
                  <button
                    onClick={() => chatMutation.mutate()}
                    disabled={chatMutation.isPending}
                    className="w-full py-3 border rounded-lg font-semibold hover:bg-gray-50 disabled:opacity-50"
                  >
                    <MessageSquare className="h-4 w-4 inline mr-2" />
                    {chatMutation.isPending ? 'Starting chat...' : 'Message owner'}
                  </button>
                </div>
              )
            ) : (
              <Link
                to="/login"
                className="block w-full py-3 bg-primary text-white text-center rounded-lg font-semibold hover:bg-primary/90"
              >
                Login to Book Viewing
              </Link>
            )}

            <div className="mt-4 text-xs text-gray-500 text-center">
              Book a viewing to see the property in person
            </div>

            {prop.owner && (
              <div className="mt-6 pt-4 border-t">
                <h4 className="text-sm font-semibold mb-2">Listed by</h4>
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-primary">
                      {(prop.owner.full_name || `${prop.owner.first_name || ''} ${prop.owner.last_name || ''}`.trim() || 'N')[0]}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-sm">{prop.owner.full_name || `${prop.owner.first_name || ''} ${prop.owner.last_name || ''}`.trim() || 'NyumbaLink owner'}</p>
                    {(prop.owner.verification_badge || prop.owner.is_verified_owner || prop.owner.is_identity_verified) && (
                      <span className="text-xs text-green-600">Verified Owner</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {isAuthenticated && user && (user.id === prop.owner?.id || ['admin', 'superadmin', 'moderator', 'verification_officer'].includes(user.role || '')) && (
            <VerificationPanel propertyId={prop.id} />
          )}        </div>
      </div>
    </div>
  );
}
