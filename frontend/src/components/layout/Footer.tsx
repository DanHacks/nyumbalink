import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t bg-gray-50">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-lg font-bold mb-4">NyumbaLink</h3>
            <p className="text-sm text-gray-600">
              Find Verified Homes. Move with Confidence.
            </p>
            <p className="text-sm text-gray-600 mt-2">
              Africa's trusted property verification platform.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">For Tenants</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/properties" className="hover:text-primary">Browse Properties</Link></li>
              <li><Link to="/search" className="hover:text-primary">Search Homes</Link></li>
              <li><Link to="/properties" className="hover:text-primary">Verified Listings</Link></li>
              <li><Link to="/register" className="hover:text-primary">Create Account</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">For Owners</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/properties/create" className="hover:text-primary">List Property</Link></li>
              <li><Link to="/dashboard" className="hover:text-primary">Owner Dashboard</Link></li>
              <li><Link to="/register" className="hover:text-primary">Get Verified</Link></li>
              <li><Link to="/" className="hover:text-primary">Premium Plans</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Company</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><span className="hover:text-primary cursor-pointer">About Us</span></li>
              <li><span className="hover:text-primary cursor-pointer">Contact</span></li>
              <li><span className="hover:text-primary cursor-pointer">Privacy Policy</span></li>
              <li><span className="hover:text-primary cursor-pointer">Terms of Service</span></li>
            </ul>
          </div>
        </div>

        <div className="border-t mt-8 pt-8 text-center text-sm text-gray-500">
          <p>&copy; {new Date().getFullYear()} NyumbaLink. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
