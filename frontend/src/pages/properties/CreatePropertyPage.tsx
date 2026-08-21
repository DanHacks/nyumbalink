import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { propertiesApi } from '@/lib/api';
import toast from 'react-hot-toast';

export default function CreatePropertyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    property_type: 'apartment',
    property_name: '',
    description: '',
    year_built: '',
    location: {
      latitude: '',
      longitude: '',
    },
    address: {
      address_line1: '',
      address_line2: '',
      city: '',
      county: '',
      sub_county: '',
      ward: '',
      landmark: '',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: any) => propertiesApi.create(data),
    onSuccess: (response) => {
      toast.success('Property created successfully!');
      queryClient.invalidateQueries({ queryKey: ['properties'] });
      navigate(`/properties/${response.data.id}`);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Failed to create property');
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      ...formData,
      year_built: formData.year_built ? parseInt(formData.year_built) : undefined,
      location: {
        latitude: parseFloat(formData.location.latitude),
        longitude: parseFloat(formData.location.longitude),
      },
    });
  };

  const updateField = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const updateAddress = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      address: { ...prev.address, [field]: value },
    }));
  };

  const updateLocation = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      location: { ...prev.location, [field]: value },
    }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold mb-8">List Your Property</h1>

      <div className="flex items-center space-x-4 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div
              className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= s ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
              }`}
            >
              {s}
            </div>
            {s < 3 && <div className={`h-1 w-12 ${step > s ? 'bg-primary' : 'bg-gray-200'}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <>
            <div>
              <label className="block text-sm font-medium mb-2">Property Type</label>
              <select
                value={formData.property_type}
                onChange={(e) => updateField('property_type', e.target.value)}
                className="w-full px-4 py-3 border rounded-lg"
              >
                <option value="apartment">Apartment Block</option>
                <option value="house">House</option>
                <option value="hostel">Hostel</option>
                <option value="guest_house">Guest House</option>
                <option value="airbnb">Airbnb</option>
                <option value="student_housing">Student Housing</option>
                <option value="commercial">Commercial</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Property Name</label>
              <input
                type="text"
                value={formData.property_name}
                onChange={(e) => updateField('property_name', e.target.value)}
                placeholder="e.g. Green Heights Apartments"
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder="Describe your property..."
                rows={4}
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Year Built</label>
              <input
                type="number"
                value={formData.year_built}
                onChange={(e) => updateField('year_built', e.target.value)}
                placeholder="e.g. 2020"
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full py-3 bg-primary text-white rounded-lg font-semibold"
            >
              Next - Location
            </button>
          </>
        )}

        {step === 2 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Latitude</label>
                <input
                  type="text"
                  value={formData.location.latitude}
                  onChange={(e) => updateLocation('latitude', e.target.value)}
                  placeholder="-1.286389"
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Longitude</label>
                <input
                  type="text"
                  value={formData.location.longitude}
                  onChange={(e) => updateLocation('longitude', e.target.value)}
                  placeholder="36.817223"
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address Line 1</label>
              <input
                type="text"
                value={formData.address.address_line1}
                onChange={(e) => updateAddress('address_line1', e.target.value)}
                placeholder="Street name, building number"
                className="w-full px-4 py-3 border rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Address Line 2 (Optional)</label>
              <input
                type="text"
                value={formData.address.address_line2}
                onChange={(e) => updateAddress('address_line2', e.target.value)}
                placeholder="Estate, area"
                className="w-full px-4 py-3 border rounded-lg"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">City</label>
                <input
                  type="text"
                  value={formData.address.city}
                  onChange={(e) => updateAddress('city', e.target.value)}
                  placeholder="e.g. Nairobi"
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">County</label>
                <input
                  type="text"
                  value={formData.address.county}
                  onChange={(e) => updateAddress('county', e.target.value)}
                  placeholder="e.g. Nairobi"
                  className="w-full px-4 py-3 border rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Sub-County</label>
                <input
                  type="text"
                  value={formData.address.sub_county}
                  onChange={(e) => updateAddress('sub_county', e.target.value)}
                  placeholder="Optional"
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Landmark</label>
                <input
                  type="text"
                  value={formData.address.landmark}
                  onChange={(e) => updateAddress('landmark', e.target.value)}
                  placeholder="e.g. Near City Market"
                  className="w-full px-4 py-3 border rounded-lg"
                />
              </div>
            </div>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 border rounded-lg font-semibold hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold"
              >
                Next - Review
              </button>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="bg-gray-50 rounded-xl p-6 space-y-3">
              <h3 className="font-semibold text-lg">Review Your Property</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Type:</span>{' '}
                  <span className="font-medium capitalize">{formData.property_type}</span>
                </div>
                <div>
                  <span className="text-gray-600">Name:</span>{' '}
                  <span className="font-medium">{formData.property_name}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Location:</span>{' '}
                  <span className="font-medium">
                    {formData.address.city}, {formData.address.county}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Address:</span>{' '}
                  <span className="font-medium">{formData.address.address_line1}</span>
                </div>
              </div>
            </div>

            <p className="text-sm text-gray-600">
              After creating the property, you will be able to add buildings, floors, rooms, and upload verification photos.
            </p>

            <div className="flex space-x-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-3 border rounded-lg font-semibold hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 py-3 bg-primary text-white rounded-lg font-semibold hover:bg-primary/90 disabled:opacity-50"
              >
                {mutation.isPending ? 'Creating...' : 'Create Property'}
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
