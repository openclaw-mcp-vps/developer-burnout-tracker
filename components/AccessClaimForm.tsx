"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ClaimResponse {
  success: boolean;
  message: string;
}

export function AccessClaimForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error" | "success">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();

    if (!email.trim()) {
      setStatus("error");
      setMessage("Enter the email address you used during Stripe checkout.");
      return;
    }

    setStatus("loading");
    setMessage("Verifying purchase and issuing access cookie...");

    try {
      const response = await fetch("/api/access/claim", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const payload = (await response.json()) as ClaimResponse;

      if (!response.ok || !payload.success) {
        setStatus("error");
        setMessage(payload.message || "Could not verify this purchase yet.");
        return;
      }

      setStatus("success");
      setMessage(payload.message || "Access unlocked. Redirecting...");
      window.location.assign("/dashboard");
    } catch {
      setStatus("error");
      setMessage("Network error while validating access. Please retry.");
    }
  }

  return (
    <form className="space-y-3" onSubmit={handleSubmit}>
      <Input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        placeholder="you@company.com"
        autoComplete="email"
        required
      />
      <Button type="submit" className="w-full" disabled={status === "loading"}>
        {status === "loading" ? "Unlocking..." : "Unlock Dashboard"}
      </Button>
      {message ? (
        <p
          className={`text-xs ${
            status === "error"
              ? "text-[#f85149]"
              : status === "success"
                ? "text-[#3fb950]"
                : "text-[#8b949e]"
          }`}
        >
          {message}
        </p>
      ) : null}
    </form>
  );
}
