import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { verificationApi } from '@/lib/api';
import toast from 'react-hot-toast';

const CATEGORIES = [
  'exterior', 'gate', 'parking', 'compound', 'kitchen', 'bedroom',
  'bathroom', 'living_room', 'corridor', 'water_point', 'electric_meter',
  'windows', 'view_outside', 'other',
];

function gpsNow(): Promise<{ lat: number; lon: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('No GPS'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      (e) => reject(e),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  });
}

export default function VerificationPanel({ propertyId }: { propertyId: string }) {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('exterior');
  const [photo, setPhoto] = useState<File | null>(null);
  const [video, setVideo] = useState<File | null>(null);

  const { data: status } = useQuery({
    queryKey: ['verification-status', propertyId],
    queryFn: () => verificationApi.getStatus(propertyId),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['verification-status', propertyId] });

  const photoMutation = useMutation({
    mutationFn: async () => {
      if (!photo) throw new Error('Choose a photo');
      const pos = await gpsNow().catch(() => null);
      const form = new FormData();
      form.append('property_id', propertyId);
      form.append('category', category);
      form.append('file', photo);
      form.append('latitude', String(pos?.lat ?? -1.2921));
      form.append('longitude', String(pos?.lon ?? 36.8219));
      form.append('timestamp', new Date().toISOString());
      return verificationApi.uploadPhoto(form);
    },
    onSuccess: () => {
      toast.success('Photo uploaded for verification');
      setPhoto(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Photo upload failed'),
  });

  const videoMutation = useMutation({
    mutationFn: async () => {
      if (!video) throw new Error('Choose a video');
      const pos = await gpsNow().catch(() => null);
      const form = new FormData();
      form.append('property_id', propertyId);
      form.append('file', video);
      form.append('latitude', String(pos?.lat ?? -1.2921));
      form.append('longitude', String(pos?.lon ?? 36.8219));
      form.append('timestamp', new Date().toISOString());
      return verificationApi.uploadVideo(form);
    },
    onSuccess: () => {
      toast.success('Video uploaded for verification');
      setVideo(null);
      invalidate();
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Video upload failed'),
  });

  const s = status?.data;

  return (
    <div className="border rounded-xl p-4 space-y-4">
      <h3 className="font-semibold">Verification</h3>
      {s && (
        <p className="text-sm text-gray-600">
          {s.photos_verified}/{s.total_photos_required} photos approved ·{' '}
          {s.video_verified ? 'video approved' : s.video_pending ? 'video pending' : 'no video'} · {s.overall_status}
        </p>
      )}
      <div className="space-y-2">
        <label className="block text-sm font-medium">Photo category</label>
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ')}</option>)}
        </select>
        <input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} className="w-full text-sm" />
        <button disabled={!photo || photoMutation.isPending} onClick={() => photoMutation.mutate()} className="w-full py-2 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50">
          {photoMutation.isPending ? 'Uploading...' : 'Upload verification photo (GPS-tagged)'}
        </button>
      </div>
      <div className="space-y-2">
        <label className="block text-sm font-medium">Walkthrough video (30–120s at property)</label>
        <input type="file" accept="video/*" onChange={(e) => setVideo(e.target.files?.[0] || null)} className="w-full text-sm" />
        <button disabled={!video || videoMutation.isPending} onClick={() => videoMutation.mutate()} className="w-full py-2 border rounded-lg text-sm font-semibold disabled:opacity-50">
          {videoMutation.isPending ? 'Uploading...' : 'Upload walkthrough video'}
        </button>
      </div>
      <p className="text-xs text-gray-500">Photos are GPS-checked (max 600m from property) and must be fresh (30 min). 12 approved photos required for verification.</p>
    </div>
  );
}
