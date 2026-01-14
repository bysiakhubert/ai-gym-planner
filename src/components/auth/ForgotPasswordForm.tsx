import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CircleAlert, CircleCheck, ArrowLeft } from "lucide-react";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/schemas/auth";

export function ForgotPasswordForm() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.message || "Wystąpił błąd podczas wysyłania linku");
        return;
      }

      // Success - show message regardless of whether email exists (security)
      setSuccess(true);
      form.reset();
    } catch (err) {
      console.error("Reset password error:", err);
      setError("Wystąpił błąd połączenia. Spróbuj ponownie");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold">Resetuj hasło</CardTitle>
        <CardDescription>
          Podaj adres email powiązany z Twoim kontem, a wyślemy Ci link do resetowania hasła
        </CardDescription>
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
              Link do resetowania hasła został wysłany na Twój adres email. Sprawdź swoją skrzynkę odbiorczą.
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
                      disabled={isSubmitting || success}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>Wprowadź adres email, którego używasz do logowania</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Submit Button */}
            <Button type="submit" className="w-full" disabled={isSubmitting || success}>
              {isSubmitting ? "Wysyłanie..." : "Wyślij link resetujący"}
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="w-full">
          <a
            href="/login"
            className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Powrót do logowania
          </a>
        </div>
        <div className="text-sm text-center text-muted-foreground">
          Nie masz konta?{" "}
          <a href="/register" className="text-primary hover:underline font-medium">
            Zarejestruj się
          </a>
        </div>
      </CardFooter>
    </Card>
  );
}
