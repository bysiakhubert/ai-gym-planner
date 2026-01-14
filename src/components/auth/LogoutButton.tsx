import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { toast } from "sonner";

/**
 * LogoutButton Component
 *
 * Provides a button to log out the current user.
 * Calls the /api/auth/signout endpoint and redirects to login page.
 */
export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (!response.ok) {
        // Server returned an error
        toast.error(data.message || "Nie udało się wylogować");
        setIsLoading(false);
        return;
      }

      // Successful logout - show success message briefly then redirect
      toast.success("Wylogowano pomyślnie");

      // Redirect to login page
      if (data.redirectTo) {
        // Small delay to show the toast
        setTimeout(() => {
          window.location.href = data.redirectTo;
        }, 500);
      }
    } catch (err) {
      console.error("Logout error:", err);
      toast.error("Wystąpił błąd połączenia. Spróbuj ponownie");
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleLogout}
      disabled={isLoading}
      className="gap-2"
      aria-label="Wyloguj się"
    >
      <LogOut className="size-4" />
      <span className="hidden sm:inline">{isLoading ? "Wylogowywanie..." : "Wyloguj"}</span>
    </Button>
  );
}
