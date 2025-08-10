"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Check for existing token on component mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedToken = localStorage.getItem("token");
      if (savedToken) {
        setToken(savedToken);
      }
      setLoading(false);
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        throw new Error("Login failed");
      }

      const data = await res.json();
      setToken(data.token);

      // Store token in localStorage
      if (typeof window !== "undefined") {
        localStorage.setItem("token", data.token);
      }

      // Clear form
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error(err);
      alert("Login failed");
    }
  };

  const handleLogout = () => {
    setToken(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
  };

  // Show loading state while checking for token
  if (loading) {
    return (
      <main>
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Quiz App</h1>
      {!token ? (
        <form onSubmit={handleLogin}>
          <input
            type="email"
            value={email}
            placeholder="Email"
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            value={password}
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit">Login</button>
        </form>
      ) : (
        <div>
          <p>Logged in!</p>
          <ul>
            <li>
              <Link href="/cards">Manage Cards</Link>
            </li>
            <li>
              <Link href="/quizzes">Start Quiz</Link>
            </li>
          </ul>
        </div>
      )}
    </main>
  );
}
