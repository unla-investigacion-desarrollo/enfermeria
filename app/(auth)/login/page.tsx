import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Ingresar" };

export default function LoginPage() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle as="h1" className="text-2xl">
          Ingresá al manual
        </CardTitle>
        <CardDescription>
          Usá el email y la contraseña que te asignó la cátedra.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          ¿No podés ingresar? Contactá a tu docente o al equipo administrativo.
        </p>
      </CardContent>
    </Card>
  );
}
