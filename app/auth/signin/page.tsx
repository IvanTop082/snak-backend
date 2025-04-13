'use client';

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { FormEvent } from "react";

export default function SignIn() {
  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const response = await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirect: false,
    });

    if (response?.ok) {
      router.push("/");
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="username">Username</label>
          <input
            type="text"
            name="username"
            id="username"
            className="block w-full rounded-md border p-2"
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            type="password"
            name="password"
            id="password"
            className="block w-full rounded-md border p-2"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-md bg-blue-500 p-2 text-white"
        >
          Sign In
        </button>
      </form>
    </div>
  );
} 