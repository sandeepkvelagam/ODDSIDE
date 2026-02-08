import { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import Logo from "@/components/Logo";
import { toast } from "sonner";
import { Home, Users, Bell, User, LogOut, Menu, X, Check, XIcon, ChevronRight } from "lucide-react";

const API = process.env.REACT_APP_BACKEND_URL + "/api";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifSheetOpen, setNotifSheetOpen] = useState(false);

  // Fetch notifications with polling
  const fetchNotifications = useCallback(async () => {
    try {
      const response = await axios.get(`${API}/notifications`);
      setNotifications(response.data.filter(n => !n.read));
    } catch (error) {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    // Poll every 15 seconds
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`${API}/notifications/read-all`);
      setNotifications([]);
    } catch (error) {
      // Silently fail
    }
  };

  const handleMarkRead = async (notificationId) => {
    try {
      await axios.put(`${API}/notifications/${notificationId}/read`);
      setNotifications(prev => prev.filter(n => n.notification_id !== notificationId));
    } catch (error) {
      // Silently fail
    }
  };

  // Handle actionable notifications
  const handleApproveJoin = async (notif) => {
    try {
      await axios.post(`${API}/games/${notif.data.game_id}/approve-join`, {
        user_id: notif.data.user_id
      });
      toast.success(`${notif.data.user_name || 'Player'} approved!`);
      handleMarkRead(notif.notification_id);
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to approve");
    }
  };

  const handleRejectJoin = async (notif) => {
    try {
      await axios.post(`${API}/games/${notif.data.game_id}/reject-join`, {
        user_id: notif.data.user_id
      });
      toast.success("Request rejected");
      handleMarkRead(notif.notification_id);
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to reject");
    }
  };

  const handleApproveBuyIn = async (notif) => {
    try {
      await axios.post(`${API}/games/${notif.data.game_id}/approve-buy-in`, {
        user_id: notif.data.user_id,
        amount: notif.data.amount,
        chips: notif.data.chips
      });
      toast.success("Buy-in approved!");
      handleMarkRead(notif.notification_id);
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to approve buy-in");
    }
  };

  const handleAcceptInvite = async (notif) => {
    try {
      await axios.post(`${API}/users/invites/${notif.data.invite_id}/respond`, {
        accept: true
      });
      toast.success("Invite accepted!");
      handleMarkRead(notif.notification_id);
      fetchNotifications();
      // Navigate to the group
      if (notif.data.group_id) {
        navigate(`/groups/${notif.data.group_id}`);
        setNotifSheetOpen(false);
      }
    } catch (error) {
      toast.error("Failed to accept invite");
    }
  };

  const handleDeclineInvite = async (notif) => {
    try {
      await axios.post(`${API}/users/invites/${notif.data.invite_id}/respond`, {
        accept: false
      });
      toast.success("Invite declined");
      handleMarkRead(notif.notification_id);
      fetchNotifications();
    } catch (error) {
      toast.error("Failed to decline invite");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/");
    } catch (error) {
      navigate("/");
    }
  };

  const isActive = (path) => location.pathname === path;

  const navLinks = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/groups", label: "Groups", icon: Users },
  ];

  // Render notification item with actions
  const renderNotification = (notif) => {
    const isActionable = ["join_request", "buy_in_request"].includes(notif.type);
    
    return (
      <div 
        key={notif.notification_id} 
        className={`p-3 border-b border-border/50 ${isActionable ? 'bg-primary/5' : ''}`}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="font-medium text-sm">{notif.title}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
            
            {/* Action buttons for join requests */}
            {notif.type === "join_request" && (
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm" 
                  className="h-7 text-xs bg-primary text-black hover:bg-primary/90"
                  onClick={() => handleApproveJoin(notif)}
                >
                  <Check className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleRejectJoin(notif)}
                >
                  <XIcon className="w-3 h-3 mr-1" /> Reject
                </Button>
              </div>
            )}
            
            {/* Action buttons for buy-in requests */}
            {notif.type === "buy_in_request" && (
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm" 
                  className="h-7 text-xs bg-primary text-black hover:bg-primary/90"
                  onClick={() => handleApproveBuyIn(notif)}
                >
                  <Check className="w-3 h-3 mr-1" /> Approve ${notif.data?.amount}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={() => handleMarkRead(notif.notification_id)}
                >
                  Dismiss
                </Button>
              </div>
            )}
            
            {/* Navigate button for game notifications */}
            {notif.data?.game_id && !isActionable && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs mt-2 p-0"
                onClick={() => {
                  handleMarkRead(notif.notification_id);
                  navigate(`/games/${notif.data.game_id}`);
                  setNotifSheetOpen(false);
                }}
              >
                View Game <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
            
            {/* Navigate button for group notifications */}
            {notif.data?.group_id && !notif.data?.game_id && !isActionable && (
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs mt-2 p-0"
                onClick={() => {
                  handleMarkRead(notif.notification_id);
                  navigate(`/groups/${notif.data.group_id}`);
                  setNotifSheetOpen(false);
                }}
              >
                View Group <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            )}
            
            {/* Accept/Decline buttons for group invites */}
            {notif.type === "group_invite_request" && notif.data?.invite_id && (
              <div className="flex gap-2 mt-2">
                <Button 
                  size="sm" 
                  className="h-7 text-xs bg-primary text-black hover:bg-primary/90"
                  onClick={() => handleAcceptInvite(notif)}
                >
                  <Check className="w-3 h-3 mr-1" /> Accept
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => handleDeclineInvite(notif)}
                >
                  <XIcon className="w-3 h-3 mr-1" /> Decline
                </Button>
              </div>
            )}
          </div>
          
          {!isActionable && notif.type !== "group_invite_request" && (
            <button
              onClick={() => handleMarkRead(notif.notification_id)}
              className="text-muted-foreground hover:text-foreground"
            >
              <XIcon className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <nav className="border-b border-border/50 bg-background/80 backdrop-blur-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Logo */}
          <div 
            className="cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <Logo size="small" />
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Button
                key={link.path}
                variant="ghost"
                onClick={() => navigate(link.path)}
                className={`${
                  isActive(link.path) 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`nav-${link.label.toLowerCase()}`}
              >
                <link.icon className="w-4 h-4 mr-2" />
                {link.label}
              </Button>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Notifications - Using Sheet for better UX */}
            <Sheet open={notifSheetOpen} onOpenChange={setNotifSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="relative w-9 h-9 sm:w-10 sm:h-10" data-testid="notifications-btn">
                  <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  {notifications.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-primary text-primary-foreground text-[10px] sm:text-xs rounded-full flex items-center justify-center font-bold animate-pulse">
                      {notifications.length}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-md p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <SheetTitle className="font-heading text-lg">Notifications</SheetTitle>
                    {notifications.length > 0 && (
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-xs"
                        onClick={handleMarkAllRead}
                      >
                        Mark all read
                      </Button>
                    )}
                  </div>
                </SheetHeader>
                <div className="overflow-y-auto max-h-[calc(100vh-80px)]">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                      <Bell className="w-10 h-10 mb-3 opacity-50" />
                      <p className="text-sm">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map(renderNotification)
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-full" data-testid="user-menu-btn">
                  <Avatar className="h-9 w-9 sm:h-10 sm:w-10">
                    <AvatarImage src={user?.picture} />
                    <AvatarFallback className="bg-primary/20 text-primary text-sm sm:text-base">{user?.name?.[0] || '?'}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52 sm:w-56 bg-card border-border">
                <div className="px-3 sm:px-4 py-2 sm:py-3">
                  <p className="font-medium text-sm sm:text-base">{user?.name}</p>
                  <p className="text-xs sm:text-sm text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer text-sm">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-destructive text-sm">
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile menu button */}
            <Button 
              variant="ghost" 
              size="icon" 
              className="md:hidden w-9 h-9"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
          </div>
        </div>

        {/* Mobile Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 sm:py-4 border-t border-border/50">
            {navLinks.map(link => (
              <Button
                key={link.path}
                variant="ghost"
                onClick={() => {
                  navigate(link.path);
                  setMobileMenuOpen(false);
                }}
                className={`w-full justify-start text-sm ${
                  isActive(link.path) 
                    ? 'bg-primary/10 text-primary' 
                    : 'text-muted-foreground'
                }`}
              >
                <link.icon className="w-4 h-4 mr-2" />
                {link.label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
