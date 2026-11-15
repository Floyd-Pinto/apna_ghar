import { useState, useEffect } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  LogOut,
  User,
  Settings,
  Moon,
  Sun,
  Menu,
  MessageSquare,
  CalendarCheck,
  Compass,
  Home,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import LoginDialog from "./LoginDialog";
import RegisterDialog from "./RegisterDialog";
import NotificationBell from "./NotificationBell";
import Logo from "./Logo";

const Header = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const [loginDialogOpen, setLoginDialogOpen] = useState(false);
  const [registerDialogOpen, setRegisterDialogOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  const dashboardPath = user?.role === "builder" ? "/dashboard/builder" : "/dashboard/buyer";
  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}` || "U";

  const navItems = [
    { to: "/", label: "Home", icon: Home, end: true, show: true },
    { to: "/explore-projects", label: "Explore", icon: Compass, end: false, show: isAuthenticated },
    { to: dashboardPath, label: "Dashboard", icon: LayoutDashboard, end: false, show: isAuthenticated },
    { to: "/bookings", label: "Bookings", icon: CalendarCheck, end: false, show: isAuthenticated },
    { to: "/admin", label: "Admin", icon: ShieldCheck, end: false, show: isAuthenticated && !!user?.is_staff },
  ].filter((item) => item.show);

  const accountItems = [
    { to: "/profile", label: "Profile", icon: User },
    { to: "/settings", label: "Settings", icon: Settings },
    { to: "/support", label: "Support", icon: MessageSquare },
  ];

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 8);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close the mobile menu whenever the route changes
  useEffect(() => setMobileMenuOpen(false), [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "rounded-md px-3 py-2 text-sm font-medium transition-colors",
      isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted",
    );

  const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
      isActive ? "bg-accent text-accent-foreground" : "text-foreground hover:bg-muted",
    );

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-[background-color,border-color,box-shadow] duration-200",
        isScrolled
          ? "border-b border-border bg-background/80 shadow-sm backdrop-blur-xl"
          : "border-b border-transparent bg-background",
      )}
    >
      <div className="container flex h-16 items-center gap-4">
        <Logo />

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <NavLink key={item.label} to={item.to} end={item.end} className={desktopLinkClass}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 text-muted-foreground"
            aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
          >
            {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {isAuthenticated && <NotificationBell />}

          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="hidden items-center gap-2 rounded-full py-1 pl-1 pr-3 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:flex">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} />
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{user?.first_name}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel className="font-normal">
                  <div className="text-sm font-semibold">
                    {user?.first_name} {user?.last_name}
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to={dashboardPath} className="cursor-pointer gap-2">
                    <LayoutDashboard /> Dashboard
                  </Link>
                </DropdownMenuItem>
                {accountItems.map(({ to, label, icon: Icon }) => (
                  <DropdownMenuItem key={to} asChild>
                    <Link to={to} className="cursor-pointer gap-2">
                      <Icon /> {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                >
                  <LogOut /> Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button variant="ghost" size="sm" onClick={() => setLoginDialogOpen(true)}>
                Log in
              </Button>
              <Button size="sm" onClick={() => setRegisterDialogOpen(true)}>
                Get started
              </Button>
            </div>
          )}

          {/* Mobile menu */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[300px] flex-col gap-0 p-0 sm:w-[340px]">
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle asChild>
                  <div>
                    <Logo showTagline={false} onClick={() => setMobileMenuOpen(false)} />
                  </div>
                </SheetTitle>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto p-3">
                {isAuthenticated && (
                  <div className="mb-3 flex items-center gap-3 rounded-lg bg-muted p-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user?.avatar} />
                      <AvatarFallback className="bg-primary text-sm font-semibold text-primary-foreground">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">
                        {user?.first_name} {user?.last_name}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{user?.email}</div>
                    </div>
                  </div>
                )}

                <nav className="space-y-1">
                  {navItems.map(({ to, label, icon: Icon, end }) => (
                    <NavLink key={label} to={to} end={end} className={mobileLinkClass}>
                      <Icon className="h-4 w-4" /> {label}
                    </NavLink>
                  ))}
                </nav>

                {isAuthenticated && (
                  <>
                    <div className="my-3 h-px bg-border" />
                    <nav className="space-y-1">
                      {accountItems.map(({ to, label, icon: Icon }) => (
                        <NavLink key={to} to={to} className={mobileLinkClass}>
                          <Icon className="h-4 w-4" /> {label}
                        </NavLink>
                      ))}
                    </nav>
                  </>
                )}
              </div>

              <div className="border-t border-border p-4">
                {isAuthenticated ? (
                  <Button
                    variant="outline"
                    className="w-full justify-center text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    <LogOut /> Log out
                  </Button>
                ) : (
                  <div className="grid gap-2">
                    <Button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setRegisterDialogOpen(true);
                      }}
                    >
                      Get started
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        setLoginDialogOpen(true);
                      }}
                    >
                      Log in
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <LoginDialog
        open={loginDialogOpen}
        onOpenChange={setLoginDialogOpen}
        onSwitchToRegister={() => {
          setLoginDialogOpen(false);
          setRegisterDialogOpen(true);
        }}
      />

      <RegisterDialog
        open={registerDialogOpen}
        onOpenChange={setRegisterDialogOpen}
        onSwitchToLogin={() => {
          setRegisterDialogOpen(false);
          setLoginDialogOpen(true);
        }}
      />
    </header>
  );
};

export default Header;
