import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StaticPage, { Section } from './StaticPage';
import { paymentsApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

const PLANS = [
  {
    name: 'Tenant',
    price: 'Free',
    tagline: 'For house-hunters',
    features: [
      'Unlimited search and map access',
      'Save and compare properties',
      'Request viewings',
      'Book rooms with tracked payments',
      'In-app messaging with owners',
      'Scam reporting',
    ],
    cta: { label: 'Create free account', to: '/register' },
    highlight: false,
  },
  {
    name: 'Owner',
    price: 'Free + optional boosts',
    tagline: 'For landlords and caretakers',
    features: [
      'List unlimited properties and rooms',
      'Verification workflow (Verified Owner badge)',
      'Booking and viewing management',
      'Occupancy analytics dashboard',
      'Respond to reviews',
      'Optional: Featured listing promotion',
    ],
    cta: { label: 'Start listing', to: '/properties/create' },
    highlight: true,
  },
  {
    name: 'Premium',
    price: 'From KES 300/mo',
    tagline: 'Visibility boosters',
    features: [
      'Featured placement in search results',
      'Priority verification queue',
      'Advanced analytics for owners',
      'Ad-free browsing for tenants',
      'Supports platform operations',
    ],
    cta: { label: 'Upgrade in dashboard', to: '/dashboard' },
    highlight: false,
  },
];

export default function PricingPage() {
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const [phone, setPhone] = useState('');
  const [plan, setPlan] = useState('standard');
  const [pendingPaymentId, setPendingPaymentId] = useState<string | null>(null);

  const { data: history } = useQuery({
    queryKey: ['payment-history'],
    queryFn: () => paymentsApi.getHistory(),
    enabled: isAuthenticated,
  });

  const subscribeMutation = useMutation({
    mutationFn: () => {
      const amounts: Record<string, number> = { basic: 300, standard: 600, premium: 1200 };
      return paymentsApi.subscribePremium(plan, amounts[plan] || 600, phone || undefined);
    },
    onSuccess: (res) => {
      toast.success(res.data.message || 'Subscription started. Check your phone for M-Pesa prompt.');
      setPendingPaymentId(res.data.payment_id || null);
      queryClient.invalidateQueries({ queryKey: ['payment-history'] });
    },
    onError: (e: any) => toast.error(e.response?.data?.detail || 'Subscription failed'),
  });

  const { data: paymentStatus } = useQuery({
    queryKey: ['payment-status', pendingPaymentId],
    queryFn: () => paymentsApi.paymentStatus(pendingPaymentId!),
    enabled: !!pendingPaymentId,
    refetchInterval: 5000,
  });

  return (
    <StaticPage
      title="Pricing"
      description="Searching is always free. Owners list for free. Optional paid tools boost visibility."
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((p) => (
          <div
            key={p.name}
            className={`rounded-2xl border p-6 ${p.highlight ? 'border-primary shadow-md' : ''}`}
          >
            <h2 className="text-lg font-bold">{p.name}</h2>
            <p className="text-sm text-muted-foreground">{p.tagline}</p>
            <p className="mt-4 text-3xl font-extrabold">{p.price}</p>
            <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-primary">✓</span> {f}
                </li>
              ))}
            </ul>
            <Link
              to={p.cta.to}
              className={`mt-6 block rounded-lg px-4 py-2.5 text-center font-semibold ${
                p.highlight
                  ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                  : 'border hover:bg-muted'
              }`}
            >
              {p.cta.label}
            </Link>
          </div>
        ))}
      </div>

      <Section title="Payments">
        <p>
          Paid features are billed in KES via M-Pesa. Every transaction gets an ID and receipt in your payment
          history. Cancel anytime — no hidden charges.
        </p>
      </Section>

      {isAuthenticated && (
        <Section title="Go Premium with M-Pesa">
          <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto] items-end">
            <div>
              <label className="block text-sm font-medium mb-1">Plan</label>
              <select value={plan} onChange={(e) => setPlan(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
                <option value="basic">Basic — KES 300/mo</option>
                <option value="standard">Standard — KES 600/mo</option>
                <option value="premium">Premium — KES 1200/mo</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">M-Pesa phone (07XX...)</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712 345 678" className="w-full px-3 py-2 border rounded-lg text-sm" />
            </div>
            <button disabled={subscribeMutation.isPending} onClick={() => subscribeMutation.mutate()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-semibold disabled:opacity-50">
              {subscribeMutation.isPending ? 'Sending...' : 'Pay with M-Pesa'}
            </button>
          </div>
          {pendingPaymentId && (
            <p className="text-sm mt-2">Payment status: <strong>{paymentStatus?.data?.status || 'pending...'}</strong> (auto-refreshes; enter M-Pesa PIN on your phone)</p>
          )}
        </Section>
      )}

      {isAuthenticated && (
        <Section title="Payment history">
          {(history?.data?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No payments yet.</p>
          ) : (
            <div className="space-y-2">
              {(history?.data ?? []).map((p: any) => (
                <div key={p.id} className="flex items-center justify-between border rounded-lg px-3 py-2 text-sm">
                  <span>KES {p.amount} · {p.type}</span>
                  <span className={p.status === 'completed' ? 'text-green-600 font-semibold' : p.status === 'failed' ? 'text-red-600 font-semibold' : 'text-yellow-600 font-semibold'}>{p.status}</span>
                </div>
              ))}
            </div>
          )}
        </Section>
      )}
    </StaticPage>
  );
}
