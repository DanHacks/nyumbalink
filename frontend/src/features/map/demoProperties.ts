import type { MapProperty, PropertyKind, VerificationLevel } from './types';

/**
 * DEMO SEED DATA — clearly labelled development data.
 * The map layer calls the backend first (GET /api/v1/map/properties);
 * this seed is only used as an offline fallback so the UI is never blank.
 */

const PHOTOS = [
  'https://images.unsplash.com/photo-1568605114967-8130f3a36994?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1554995207-c18c203602cb?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=800&q=70',
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=70',
];

type Seed = [
  name: string,
  kind: PropertyKind,
  houseType: string,
  estate: string,
  town: string,
  county: string,
  lat: number,
  lng: number,
  price: number,
  unit: 'month' | 'night',
  units: number,
  available: number,
  verification: VerificationLevel,
  rating: number,
  services: string[],
];

const SEEDS: Seed[] = [
  ['Green Heights', 'rental', 'Bedsitter', 'Manyatta', 'Kisumu', 'Kisumu', -0.0982, 34.7712, 7500, 'month', 12, 3, 'gold', 4.7, ['Wi-Fi', 'Water 24/7', 'Parking', 'Security']],
  ['Lakeview Court', 'apartment', '1 Bedroom', 'Milimani', 'Kisumu', 'Kisumu', -0.1005, 34.7534, 18500, 'month', 20, 2, 'platinum', 4.9, ['Wi-Fi', 'Backup Power', 'CCTV', 'Parking', 'Lift']],
  ['Nyalenda Studios', 'rental', 'Single Room', 'Nyalenda', 'Kisumu', 'Kisumu', -0.1163, 34.7639, 4200, 'month', 16, 5, 'verified', 4.1, ['Water 24/7', 'Security']],
  ['Riat Hills Villa', 'villa', '4 Bedroom', 'Riat Hills', 'Kisumu', 'Kisumu', -0.0631, 34.7108, 95000, 'month', 2, 1, 'platinum', 5.0, ['Solar', 'Pool', 'Guards', 'Parking', 'Wi-Fi']],
  ['Dunga Bay Stay', 'airbnb', 'Studio', 'Dunga', 'Kisumu', 'Kisumu', -0.1298, 34.7452, 3800, 'night', 4, 2, 'gold', 4.8, ['Wi-Fi', 'Kitchen', 'Hot Shower', 'Cleaning']],
  ['Mamboleo Hostel', 'hostel', 'Hostel Room', 'Mamboleo', 'Kisumu', 'Kisumu', -0.0517, 34.7861, 5200, 'month', 40, 11, 'verified', 4.0, ['Wi-Fi', 'Water 24/7', 'Guards', 'Laundry']],
  ['Kisii Campus Rooms', 'hostel', 'Bedsitter', 'Nyanchwa', 'Kisii', 'Kisii', -0.6820, 34.7770, 6500, 'month', 32, 7, 'gold', 4.4, ['Wi-Fi', 'Water 24/7', 'Security', 'Workspace']],
  ['Daraja Mbili Homes', 'rental', '1 Bedroom', 'Daraja Mbili', 'Kisii', 'Kisii', -0.6693, 34.7657, 11000, 'month', 10, 2, 'verified', 4.2, ['Water 24/7', 'Parking']],
  ['Gusii Guest House', 'guest_house', 'Double Room', 'Town Centre', 'Kisii', 'Kisii', -0.6773, 34.7796, 2700, 'night', 18, 6, 'verified', 4.3, ['Wi-Fi', 'Restaurant', 'Parking', 'Hot Shower']],
  ['Nyanchwa Ridge', 'apartment', '2 Bedroom', 'Nyanchwa', 'Kisii', 'Kisii', -0.6905, 34.7842, 24000, 'month', 14, 0, 'gold', 4.6, ['Wi-Fi', 'Backup Power', 'CCTV', 'Lift', 'Parking']],
  ['Kilimani Terraces', 'apartment', '2 Bedroom', 'Kilimani', 'Nairobi', 'Nairobi', -1.2894, 36.7855, 62000, 'month', 30, 4, 'platinum', 4.8, ['Wi-Fi', 'Gym', 'Pool', 'Backup Power', 'Guards', 'Lift']],
  ['Ngara Bedsitters', 'rental', 'Bedsitter', 'Ngara', 'Nairobi', 'Nairobi', -1.2745, 36.8306, 9800, 'month', 24, 6, 'verified', 3.9, ['Water 24/7', 'Security', 'Laundry']],
  ['Westlands Loft', 'airbnb', 'Studio', 'Westlands', 'Nairobi', 'Nairobi', -1.2649, 36.8032, 6200, 'night', 6, 3, 'gold', 4.9, ['Wi-Fi', 'Kitchen', 'Workspace', 'Parking', 'Cleaning']],
  ['South B Court', 'apartment', '1 Bedroom', 'South B', 'Nairobi', 'Nairobi', -1.3080, 36.8330, 27000, 'month', 18, 2, 'verified', 4.3, ['Wi-Fi', 'Parking', 'CCTV', 'Water 24/7']],
  ['Kasarani Student Hub', 'hostel', 'Single Room', 'Kasarani', 'Nairobi', 'Nairobi', -1.2202, 36.8968, 6800, 'month', 60, 14, 'verified', 4.0, ['Wi-Fi', 'Guards', 'Laundry', 'Workspace']],
  ['CBD Executive Suites', 'guest_house', 'Executive Room', 'CBD', 'Nairobi', 'Nairobi', -1.2841, 36.8233, 4900, 'night', 22, 5, 'gold', 4.5, ['Wi-Fi', 'Restaurant', 'Backup Power', 'Hot Shower']],
  ['Karen Garden Villa', 'villa', '5 Bedroom', 'Karen', 'Nairobi', 'Nairobi', -1.3191, 36.7062, 240000, 'month', 1, 1, 'platinum', 5.0, ['Solar', 'Pool', 'Guards', 'Electric Fence', 'Parking', 'Wi-Fi']],
  ['Kahawa Sukari Homes', 'rental', '3 Bedroom', 'Kahawa Sukari', 'Nairobi', 'Nairobi', -1.1836, 36.9268, 45000, 'month', 8, 1, 'gold', 4.6, ['Wi-Fi', 'Parking', 'Guards', 'Water 24/7']],
  ['Nakuru Milimani Flats', 'apartment', '1 Bedroom', 'Milimani', 'Nakuru', 'Nakuru', -0.2961, 36.0703, 16500, 'month', 16, 3, 'verified', 4.2, ['Wi-Fi', 'Parking', 'CCTV']],
  ['Lanet Bedsitters', 'rental', 'Bedsitter', 'Lanet', 'Nakuru', 'Nakuru', -0.3159, 36.1373, 6900, 'month', 20, 8, 'basic', 3.7, ['Water 24/7', 'Security']],
  ['Nyali Beach Stay', 'airbnb', '1 Bedroom', 'Nyali', 'Mombasa', 'Mombasa', -4.0435, 39.7003, 7400, 'night', 5, 2, 'gold', 4.8, ['Wi-Fi', 'Pool', 'Kitchen', 'Parking', 'Cleaning']],
  ['Bamburi Guest Lodge', 'guest_house', 'Twin Room', 'Bamburi', 'Mombasa', 'Mombasa', -3.9915, 39.7285, 3200, 'night', 14, 4, 'verified', 4.1, ['Wi-Fi', 'Restaurant', 'Parking']],
  ['Eldoret Elgon View', 'apartment', '2 Bedroom', 'Elgon View', 'Eldoret', 'Uasin Gishu', 0.5152, 35.2760, 29000, 'month', 12, 2, 'gold', 4.5, ['Wi-Fi', 'Backup Power', 'Guards', 'Parking']],
  ['Langas Rooms', 'rental', 'Single Room', 'Langas', 'Eldoret', 'Uasin Gishu', 0.4886, 35.2497, 3900, 'month', 26, 9, 'basic', 3.6, ['Water 24/7']],
  ['Thika Greens Plaza', 'commercial', 'Retail Unit', 'Thika Town', 'Thika', 'Kiambu', -1.0388, 37.0834, 55000, 'month', 9, 3, 'verified', 4.2, ['Backup Power', 'CCTV', 'Parking', 'Wi-Fi']],
  ['Machakos Hilltop', 'rental', '1 Bedroom', 'Mumbuni', 'Machakos', 'Machakos', -1.5177, 37.2634, 13500, 'month', 10, 4, 'verified', 4.0, ['Water 24/7', 'Parking', 'Security']],
];

function code(town: string, estate: string, i: number) {
  const t = town.slice(0, 3).toUpperCase();
  const e = estate.replace(/[^a-z]/gi, '').slice(0, 3).toUpperCase();
  return `NL-${t}-${e}-${String(i + 1).padStart(6, '0')}`;
}

export const demoProperties: MapProperty[] = SEEDS.map((s, i) => {
  const [name, kind, houseType, estate, town, county, lat, lng, price, priceUnit, totalUnits, availableUnits, verification, rating, services] = s;
  const reserved = availableUnits > 2 ? 2 : 0;
  const trust = { basic: 62, verified: 81, gold: 93, platinum: 98 }[verification];
  return {
    id: `demo-${i + 1}`,
    nlId: code(town, estate, i),
    name,
    kind,
    houseType,
    estate,
    town,
    county,
    lat,
    lng,
    locationPrecision: kind === 'rental' || kind === 'apartment' || kind === 'villa' ? 'approximate' : 'exact',
    price,
    priceUnit,
    rating,
    reviews: 8 + ((i * 7) % 60),
    totalUnits,
    occupiedUnits: totalUnits - availableUnits - reserved,
    reservedUnits: reserved,
    availableUnits,
    availableFrom: availableUnits === 0 ? 'in 5 days' : undefined,
    verification,
    hasWalkthrough: verification === 'gold' || verification === 'platinum',
    trustScore: trust,
    ownerTrust: Math.max(55, trust - ((i * 3) % 9)),
    caretakerScore: Math.round((rating - 0.1) * 10) / 10,
    safety: i === 19 ? 'under_review' : i === 23 ? 'restricted' : 'active',
    services,
    photo: PHOTOS[i % PHOTOS.length],
    demo: true,
  } as MapProperty;
});
