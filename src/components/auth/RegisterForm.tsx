import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CircleAlert, CircleCheck } from "lucide-react";
import { registerSchema, type RegisterFormData } from "@/lib/schemas/auth";

export function RegisterForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleSubmit = async (data: RegisterFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        // Server returned an error
        setError(result.message || "Nie udało się utworzyć konta");
        return;
      }

      // Successful registration
      setSuccess(true);
      form.reset();

      // Redirect to login page after 2 seconds
      if (result.redirectTo) {
        setTimeout(() => {
          window.location.href = result.redirectTo;
        }, 2000);
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Wystąpił błąd połączenia. Spróbuj ponownie");
    } finally {
      setIsSubmitting(false);
    }
  };

  const password = form.watch("password");

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Utwórz konto</CardTitle>
        <CardDescription>Wypełnij formularz, aby założyć nowe konto</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <CircleAlert className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-6 border-green-500 bg-green-50 text-green-900 dark:bg-green-950 dark:text-green-100">
            <CircleCheck className="h-4 w-4" />
            <AlertDescription>
              Konto zostało utworzone pomyślnie! Za chwilę zostaniesz przekierowany do strony logowania.
            </AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Email Field */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="twoj@email.pl"
                      autoComplete="email"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Będziesz używać tego adresu do logowania</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Field */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Minimum 8 znaków, w tym wielka litera, mała litera i cyfra</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Confirm Password Field */}
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Potwierdź hasło</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="••••••••"
                      autoComplete="new-password"
                      disabled={isSubmitting}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password Strength Indicators */}
            {password && (
              <div className="space-y-2 rounded-md border p-3 text-xs">
                <p className="font-medium text-muted-foreground">Wymagania hasła:</p>
                <ul className="space-y-1">
                  <li className={password.length >= 8 ? "text-green-600" : "text-muted-foreground"}>
                    {password.length >= 8 ? "✓" : "○"} Minimum 8 znaków
                  </li>
                  <li className={/[A-Z]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                    {/[A-Z]/.test(password) ? "✓" : "○"} Wielka litera
                  </li>
                  <li className={/[a-z]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                    {/[a-z]/.test(password) ? "✓" : "○"} Mała litera
                  </li>
                  <li className={/[0-9]/.test(password) ? "text-green-600" : "text-muted-foreground"}>
                    {/[0-9]/.test(password) ? "✓" : "○"} Cyfra
                  </li>
                </ul>
              </div>
            )}

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Tworzenie konta..." : "Zarejestruj się"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          Masz już konto?{" "}
          <a href="/login" className="text-primary hover:underline font-medium">
            Zaloguj się
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
