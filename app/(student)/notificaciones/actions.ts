"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import { requireUser } from "@/lib/auth/guard";

function revalidateNotifications() {
  revalidatePath("/notificaciones");
  revalidatePath("/inicio");
}

export async function markNotificationReadAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const id = formData.get("id");

  if (typeof id !== "string" || id.length === 0) return;

  await prisma.notification.updateMany({
    where: { id, userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidateNotifications();
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const user = await requireUser();

  await prisma.notification.updateMany({
    where: { userId: user.id, readAt: null },
    data: { readAt: new Date() },
  });

  revalidateNotifications();
}
