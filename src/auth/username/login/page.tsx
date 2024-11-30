"use client";

import { buttonStyles } from "@/styles/button";
import { helperTextStyles, inputStyles, labelStyles } from "@/styles/input";
import Spinner from "@/components/primitives/spinner";
import React, { useActionState } from "react";
import serverAction from "./action";
import Image from "next/image";

export default function Page() {
  const [state, action, pending] = useActionState(serverAction, undefined);

  return (
    <div className="flex h-[100dvh] flex-grow justify-center bg-secondary py-12 md:py-24">
      <div className="flex h-fit flex-col items-center rounded-2xl border bg-primary px-10 py-8 shadow-sm">
        <Image height={48} width={48} src="/logo.svg" alt="Logo" priority />
        <h1 className="mt-5 text-display-xs font-semibold">Sign in</h1>
        <form action={action} className="mt-6 flex flex-col gap-5">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="username" className={labelStyles(true)}>
              Username
            </label>
            <input
              id="username"
              name="username"
              autoComplete="username"
              className={inputStyles({
                size: "sm",
                error: state?.errors.username ? true : false,
              })}
            />
            {state?.errors.username ? (
              <p className={helperTextStyles(true)}>{state?.errors.username}</p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" className={labelStyles(true)}>
              Password
            </label>
            <input
              id="password"
              type="password"
              name="password"
              className={inputStyles({
                size: "sm",
                error: state?.errors.password ? true : false,
              })}
            />
            {state?.errors.password ? (
              <p className={helperTextStyles(true)}>{state?.errors.password}</p>
            ) : null}
          </div>
          {state?.errors.root ? (
            <p className={helperTextStyles(true)}>{state?.errors.root}</p>
          ) : null}
          <button
            type="submit"
            className={buttonStyles(
              {
                variant: "primary",
                size: "lg",
              },
              "mt-1"
            )}
            disabled={pending}
          >
            {pending ? <Spinner size={20} /> : null}
            <span>Sign in</span>
          </button>
        </form>
      </div>
    </div>
  );
}
