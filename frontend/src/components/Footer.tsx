import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";
import Logo from "./Logo";

const linkGroups = [
  {
    title: "Platform",
    links: [
      { label: "Home", to: "/" },
      { label: "Explore projects", to: "/explore-projects" },
      { label: "Dashboard", to: "/dashboard" },
      { label: "My bookings", to: "/bookings" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Profile", to: "/profile" },
      { label: "Notifications", to: "/notifications" },
      { label: "Settings", to: "/settings" },
      { label: "Support", to: "/support" },
    ],
  },
];

const Footer = () => (
  <footer className="border-t border-border bg-card">
    <div className="container py-12 sm:py-16">
      <div className="grid gap-10 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            Real estate with nothing to hide. Construction updates are geotagged, timestamped and anchored on
            Hyperledger Fabric, with documents stored on IPFS.
          </p>
          <ul className="mt-6 space-y-2.5 text-sm text-muted-foreground">
            <li className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 text-primary" /> contact@apnaghar.com
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="h-4 w-4 text-primary" /> +91 98765 43210
            </li>
            <li className="flex items-center gap-2.5">
              <MapPin className="h-4 w-4 text-primary" /> Mumbai, Maharashtra, India
            </li>
          </ul>
        </div>

        {linkGroups.map((group) => (
          <div key={group.title}>
            <h3 className="text-sm font-semibold">{group.title}</h3>
            <ul className="mt-4 space-y-2.5">
              {group.links.map((link) => (
                <li key={link.to}>
                  <Link to={link.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mt-12 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>© {new Date().getFullYear()} ApnaGhar. All rights reserved.</p>
        <p>Built with Django, React and Hyperledger Fabric.</p>
      </div>
    </div>
  </footer>
);

export default Footer;
