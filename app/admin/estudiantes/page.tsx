import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { requireAdmin } from "@/lib/auth/guard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { CreateStudentForm } from "./create-student-form";
import { ResetPasswordForm } from "./reset-password-form";
import { toggleStudentActiveAction } from "./actions";

export const metadata: Metadata = { title: "Estudiantes" };

const PAGE_SIZE = 20;
const pageSchema = z.coerce.number().int().min(1).max(999).catch(1);

type PageProps = {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
};

export default async function AdminEstudiantesPage({ searchParams }: PageProps) {
  await requireAdmin();

  const params = await searchParams;
  const rawSearch = Array.isArray(params.q) ? params.q[0] : params.q;
  const rawPage = Array.isArray(params.page) ? params.page[0] : params.page;
  const search = (rawSearch ?? "").trim().slice(0, 60);
  const terms = search.split(/\s+/).filter(Boolean).slice(0, 5);
  const requestedPage = pageSchema.parse(rawPage);

  const where = {
    role: "STUDENT" as const,
    ...(terms.length > 0
      ? {
          AND: terms.map((term) => ({
            OR: [
              { firstName: { contains: term, mode: "insensitive" as const } },
              { lastName: { contains: term, mode: "insensitive" as const } },
              { email: { contains: term, mode: "insensitive" as const } },
            ],
          })),
        }
      : {}),
  };

  const total = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(requestedPage, totalPages);

  const students = await prisma.user.findMany({
    where,
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      dni: true,
      email: true,
      active: true,
      mustChangePassword: true,
      createdAt: true,
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-navy">Estudiantes</h1>
        <p className="text-sm text-muted-foreground">
          Alta, desactivación y reseteo de contraseñas. Los estudiantes deben cambiar la
          contraseña provisoria en el primer ingreso.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Nuevo estudiante</CardTitle>
        </CardHeader>
        <CardContent>
          <CreateStudentForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-lg">
            Listado{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({total} {total === 1 ? "estudiante" : "estudiantes"})
            </span>
          </CardTitle>

          <form action="/admin/estudiantes" method="get" className="flex w-full gap-2 sm:max-w-sm">
            <Input
              type="search"
              name="q"
              defaultValue={search}
              placeholder="Buscar por nombre, apellido o email"
              aria-label="Buscar estudiantes"
              className="h-9"
            />
            <Button type="submit" size="sm" variant="secondary" aria-label="Buscar">
              <Search className="h-4 w-4" aria-hidden="true" />
            </Button>
            {search ? (
              <Link
                href="/admin/estudiantes"
                className="flex h-9 items-center rounded-md px-2 text-xs text-muted-foreground underline-offset-4 hover:underline"
              >
                Limpiar
              </Link>
            ) : null}
          </form>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {search
                ? "No encontramos estudiantes con esa búsqueda."
                : "Todavía no hay estudiantes cargados."}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th scope="col" className="px-2 py-2 font-semibold">Estudiante</th>
                    <th scope="col" className="px-2 py-2 font-semibold">DNI</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Email</th>
                    <th scope="col" className="px-2 py-2 font-semibold">Estado</th>
                    <th scope="col" className="px-2 py-2 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((student) => {
                    const name = `${student.firstName} ${student.lastName}`;
                    return (
                      <tr
                        key={student.id}
                        className={
                          student.active ? "border-b border-border/60" : "border-b border-border/60 opacity-60"
                        }
                      >
                        <td className="px-2 py-3 font-medium">{name}</td>
                        <td className="px-2 py-3 tabular-nums">{student.dni}</td>
                        <td className="px-2 py-3 text-muted-foreground">{student.email}</td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col gap-1">
                            <span
                              className={
                                student.active
                                  ? "inline-flex w-fit rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                                  : "inline-flex w-fit rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground"
                              }
                            >
                              {student.active ? "Activo" : "Inactivo"}
                            </span>
                            {student.mustChangePassword ? (
                              <span className="text-[11px] text-muted-foreground">
                                Contraseña sin cambiar
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <div className="flex flex-col items-end gap-2">
                            <form action={toggleStudentActiveAction}>
                              <input type="hidden" name="userId" value={student.id} />
                              <Button
                                type="submit"
                                variant="outline"
                                size="sm"
                                aria-label={`${student.active ? "Desactivar" : "Reactivar"} a ${name}`}
                              >
                                {student.active ? "Desactivar" : "Reactivar"}
                              </Button>
                            </form>
                            <ResetPasswordForm studentId={student.id} studentName={name} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pagination
            page={safePage}
            totalPages={totalPages}
            basePath="/admin/estudiantes"
            searchParams={{ q: search }}
            className="pt-4"
          />
        </CardContent>
      </Card>
    </div>
  );
}
