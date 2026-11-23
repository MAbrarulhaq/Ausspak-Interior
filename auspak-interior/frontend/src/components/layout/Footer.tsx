import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import { services } from '../../data/services';
import { navItems } from './Header';
import { siteConfig, whatsappUrl, mapsUrl } from '../../data/siteConfig';

export default function Footer() {
  const link =
    'text-sm text-[#c4c6ce] hover:text-[#d6b43c] transition-colors duration-200';

  return (
    <footer className="w-full border-t-4 border-[#d4af37] bg-[#292d38] text-white">

      <div className="mx-auto max-w-[1700px] px-margin-mobile py-12 md:px-margin-tablet lg:px-margin">

        {/* Main Footer */}
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">

          {/* Brand Section */}
          <div className="space-y-5">

            <Link to="/" className="inline-block">
              <h2 className="font-headline-lg text-3xl font-semibold tracking-wide text-white">
                AUSSPAK
              </h2>
              <p className="text-xs tracking-[0.2em] text-[#d4af37]">
                INTERIOR
              </p>
            </Link>

            <p className="max-w-sm text-sm leading-6 text-[#c4c6ce]">
              Elevating living spaces with unparalleled woodwork, custom tailored
              for those who demand excellence in Islamabad and beyond.
            </p>

            {/* Social Media */}
            <div className="flex items-center gap-3 pt-2">

              {/* Facebook */}
              <a
                href={siteConfig.facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#3b404b] transition hover:bg-[#d4af37] hover:text-[#292d38]"
              >
                <span className="text-lg font-bold">f</span>
              </a>

            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-5">

            <h3 className="font-headline-md text-lg font-semibold text-white">
              Quick Links
            </h3>

            <ul className="space-y-3">
              {navItems.map((n) => (
                <li key={n.to}>
                  <Link className={link} to={n.to}>
                    {n.label}
                  </Link>
                </li>
              ))}

              <li>
                <Link className={link} to="/contact">
                  Contact Us
                </Link>
              </li>

              <li>
                <Link
                  to="/login"
                  className="text-sm text-[#d4af37] transition hover:text-white"
                >
                  Client Portal Login
                </Link>
              </li>
            </ul>

          </div>

          {/* Contact Us */}
          <div className="space-y-5">
            <h3 className="font-headline-md text-lg font-semibold text-white">
              Contact Us
            </h3>

            <div className="space-y-4 text-sm text-[#c4c6ce]">

              {/* Address / Google Maps */}
              <a
                  href={mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 transition hover:text-[#d4af37]"
                >
                  <Icon name="location" className="mt-1 shrink-0 text-[#d4af37]" />
                  <span className="leading-6">{siteConfig.address}</span>
              </a>

              {/* Phone Numbers */}
              {siteConfig.phones
                .filter((p) => p.label !== 'Email')
                .map((p) => (
                  <a
                    key={p.display}
                    href={`tel:${p.display.replace(/\D/g, '')}`}
                    className="flex items-center gap-3 transition hover:text-[#d4af37]"
                  >
                    <Icon name="phone" className="shrink-0 text-[#d4af37]" />
                    <span>{p.display}</span>
                  </a>
                ))}

              {/* Email */}
              {siteConfig.phones
                .filter((p) => p.label === 'Email')
                .map((p) => (
                  <a
                    key={p.display}
                    href={`mailto:${p.display}`}
                    className="flex items-center gap-3 transition hover:text-[#d4af37]"
                  >
                    <Icon name="mail" className="shrink-0 text-[#d4af37]" />
                    <span>{p.display}</span>
                  </a>
                ))}

              {/* WhatsApp */}
              <a
                href={whatsappUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 font-semibold text-[#d4af37] transition hover:text-white"
              >
                <Icon name="chat" className="shrink-0" />
                <span>WhatsApp Us</span>
              </a>

            </div>
          </div>

          {/* Book Consultation */}
          <div className="space-y-5">

            <h3 className="font-headline-md text-lg font-semibold text-white">
              Book Consultation
            </h3>

            <p className="text-sm leading-6 text-[#c4c6ce]">
              Leave your email and our team will reach out to you.
              Let us help bring your interior vision to life.
            </p>

            <Link
              to="/contact"
              className="inline-flex w-full items-center justify-center bg-[#d4af37] px-5 py-3 text-sm font-semibold text-[#292d38] transition hover:bg-[#e5c44e]"
            >
              Request Consultation
            </Link>

            {/* Services */}
            <div className="pt-2">
              <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#d4af37]">
                Services & Craft
              </h4>

              <ul className="space-y-2">
                {services.map((s) => (
                  <li key={s.slug}>
                    <Link
                      className={link}
                      to={`/services#${s.slug}`}
                    >
                      {s.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 border-t border-[#414550] pt-6">

          <div className="flex flex-col gap-4 text-xs text-[#aeb1ba] sm:flex-row sm:items-center sm:justify-between">

            <p>
              © {new Date().getFullYear()} {siteConfig.companyName}. All rights reserved.
            </p>

            <div className="flex flex-wrap gap-5">
              <Link to="/privacy-policy" className={link}>
                Privacy Policy
              </Link>

              <Link to="/terms" className={link}>
                Terms & Conditions
              </Link>
            </div>

          </div>
        </div>

      </div>
    </footer>
  );
}