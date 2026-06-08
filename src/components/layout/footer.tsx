import Link from "next/link";
import Image from "next/image";
import { SITE_NAME } from "@/lib/constants";

const footerLinks = {
  Platform: [
    { href: "/promotions", label: "Promotions" },
    { href: "/vip", label: "VIP Program" },
    { href: "/about", label: "About Us" },
    { href: "/support", label: "Support" },
  ],
  Account: [
    { href: "/login", label: "Login" },
    { href: "/register", label: "Register" },
    { href: "/dashboard", label: "Dashboard" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <Image src="/logo.jpeg" alt={SITE_NAME} width={32} height={32} className="rounded-lg" />
              <span className="text-lg font-bold gradient-text">{SITE_NAME}</span>
            </Link>
            <p className="text-sm text-muted-foreground max-w-sm">
              Premium gaming support and account platform. Request game accounts, earn VIP rewards, and get 24/7 live chat support.
            </p>
          </div>

          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold mb-4">{title}</h3>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} {SITE_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Premium Gaming Support Platform
          </p>
        </div>
      </div>
    </footer>
  );
}
