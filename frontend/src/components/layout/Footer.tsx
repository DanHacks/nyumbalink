import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-secondary text-slate-200">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <img src="/logo.png" alt="NyumbaLink" className="h-9 w-9 rounded-lg bg-white object-contain p-0.5" />
              <h3 className="text-lg font-bold text-white">Nyumba<span className="text-orange-400">Link</span></h3>
            </Link>
            <p className="text-sm text-slate-300">
              Find Verified Homes. Move with Confidence.
            </p>
            <p className="text-sm text-slate-400 mt-2">
              Africa's trusted property verification platform.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">For Tenants</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/properties" className="transition hover:text-orange-400">Browse Properties</Link></li>
              <li><Link to="/search" className="transition hover:text-orange-400">Search Homes</Link></li>
              <li><Link to="/properties" className="transition hover:text-orange-400">Verified Listings</Link></li>
              <li><Link to="/register" className="transition hover:text-orange-400">Create Account</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">For Owners</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><Link to="/properties/create" className="transition hover:text-orange-400">List Property</Link></li>
              <li><Link to="/dashboard" className="transition hover:text-orange-400">Owner Dashboard</Link></li>
              <li><Link to="/register" className="transition hover:text-orange-400">Get Verified</Link></li>
              <li><Link to="/" className="transition hover:text-orange-400">Premium Plans</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-white">Company</h4>
            <ul className="space-y-2 text-sm text-slate-300">
              <li><span className="transition hover:text-orange-400 cursor-pointer">About Us</span></li>
              <li><span className="transition hover:text-orange-400 cursor-pointer">Contact</span></li>
              <li><span className="transition hover:text-orange-400 cursor-pointer">Privacy Policy</span></li>
              <li><span className="transition hover:text-orange-400 cursor-pointer">Terms of Service</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/15 mt-8 pt-8 text-center text-sm text-slate-400">
          <p>&copy; {new Date().getFullYear()} NyumbaLink. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
