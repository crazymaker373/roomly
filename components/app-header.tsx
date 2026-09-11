"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Receipt, Scale, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { signOutAction } from "@/lib/actions/auth-actions";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  displayName: string;
  email: string;
  householdName: string;
}

const navItems = [
  { href: "/dashboard", label: "Grundriss", icon: Home },
  { href: "/expenses", label: "Ausgaben", icon: Receipt },
  { href: "/settle", label: "Abrechnung", icon: Scale },
];

export function AppHeader({
  displayName,
  email,
  householdName,
}: AppHeaderProps) {
  const pathname = usePathname();
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="flex flex-col">
            <span className="text-lg font-bold tracking-tight">Roomly</span>
            <span className="text-xs text-muted-foreground">{householdName}</span>
          </Link>
          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent",
                  pathname === href || pathname.startsWith(href + "/")
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="hidden items-center gap-2 sm:flex">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-right text-sm leading-tight">
              <p className="font-medium">{displayName}</p>
              <p className="text-xs text-muted-foreground">{email}</p>
            </div>
          </div>
          <form action={signOutAction}>
            <Button variant="ghost" size="icon" type="submit" aria-label="Abmelden">
              <LogOut className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
      <nav className="flex border-t md:hidden">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-1 py-2 text-xs",
              pathname === href || pathname.startsWith(href + "/")
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
