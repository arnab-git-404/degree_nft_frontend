import { Navbar } from './Navbar';
import { AuthBanner } from './AuthBanner';
import { Toaster } from 'react-hot-toast';



export function Layout({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <Toaster position="top-center" /> 
      <Navbar />
      <AuthBanner />
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}