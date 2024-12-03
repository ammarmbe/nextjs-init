"use server";

import { userSchemas } from "@/schemas/user";
import { redirect } from "next/navigation";
import db from "@/utils/db";
import {
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from "@/utils/auth";

type FormState = {
  errors: Record<"username" | "password" | "root", string>;
};

export default async function action(
  _: FormState | undefined,
  formData: FormData
) {
  const data = userSchemas.login.safeParse({
    username: formData.get("username"),
    password: formData.get("password"),
  });

  if (!data.success) {
    return {
      errors: Object.fromEntries(
        data.error.errors.map((error) => [error.path.join("."), error.message])
      ),
    } as FormState;
  }

  const user = await db.user.findUnique({
    where: {
      username: data.data.username,
      password: data.data.password,
    },
  });

  if (!user) {
    return {
      errors: {
        root: "Invalid username or password",
      },
    } as FormState;
  }

  const token = generateSessionToken();

  await createSession(token, user.id);

  await setSessionTokenCookie(
    token,
    new Date(Date.now() + 1000 * 60 * 60 * 24 * 30)
  );

  return redirect("/");
}
