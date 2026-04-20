export default function Footer() {
  return (
    <footer className="bg-blue-600 text-white py-12 px-6">

      {/* Top Links */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">

        {/* About */}
        <div>
          <h3 className="text-lg font-bold mb-4">E-Learning Platform</h3>
          <p className="text-sm">
            Enhancing learning for teachers and students with intuitive tools and features.
          </p>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Company</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-blue-200">About Us</a></li>
            <li><a href="#" className="hover:text-blue-200">Careers</a></li>
            <li><a href="#" className="hover:text-blue-200">Blog</a></li>
          </ul>
        </div>

        {/* Resources */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Resources</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-blue-200">Help Center</a></li>
            <li><a href="#" className="hover:text-blue-200">FAQs</a></li>
            <li><a href="#" className="hover:text-blue-200">Documentation</a></li>
          </ul>
        </div>

        {/* Legal */}
        <div>
          <h4 className="text-lg font-semibold mb-4">Legal</h4>
          <ul className="space-y-2 text-sm">
            <li><a href="#" className="hover:text-blue-200">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-blue-200">Terms of Service</a></li>
            <li><a href="#" className="hover:text-blue-200">Cookie Policy</a></li>
          </ul>
        </div>

      </div>

      {/* Divider */}
      <div className="border-t border-blue-400 my-8"></div>

      {/* Bottom Social & Copyright */}
      <div className="flex flex-col md:flex-row items-center justify-between text-sm">

        {/* Social Icons */}
        <div className="flex gap-4 mb-4 md:mb-0">
          <a href="#" className="hover:text-blue-200">Twitter</a>
          <a href="#" className="hover:text-blue-200">Facebook</a>
          <a href="#" className="hover:text-blue-200">Instagram</a>
          <a href="#" className="hover:text-blue-200">LinkedIn</a>
        </div>

        {/* Copyright */}
        <p className="text-gray-200">
          © {new Date().getFullYear()} E-Learning Platform. All rights reserved.
        </p>

      </div>
    </footer>
  );
}