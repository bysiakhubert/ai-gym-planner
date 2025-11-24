import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertTriangle } from "lucide-react";

export function SafetyDisclaimer() {
  return (
    <Alert variant="default" className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
      <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-500" />
      <AlertTitle className="text-yellow-900 dark:text-yellow-100">Ważne informacje bezpieczeństwa</AlertTitle>
      <AlertDescription className="text-yellow-800 dark:text-yellow-200">
        <ul className="mt-2 space-y-1 list-disc list-inside">
          <li>Ten plan treningowy został wygenerowany przez AI i ma charakter wyłącznie informacyjny</li>
          <li>Przed rozpoczęciem jakiegokolwiek programu treningowego skonsultuj się z lekarzem lub fizjoterapeutą</li>
          <li>Jeśli podczas ćwiczeń odczuwasz ból lub dyskomfort, natychmiast przerwij trening</li>
          <li>Pamiętaj o odpowiedniej rozgrzewce przed treningiem i stretching po treningu</li>
        </ul>
      </AlertDescription>
    </Alert>
  );
}
