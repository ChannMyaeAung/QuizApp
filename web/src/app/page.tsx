"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogOut, BookOpen, Play } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLogging, setIsLogging] = useState(false);
  const [error, setError] = useState("");

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
    setIsLogging(true);
    setError("");

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
    } finally {
      setIsLogging(false);
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
      <div className="quiz-container">
        <div className="flex items-center justify-center min-h-[50vh]">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <div className="mb-8 space-y-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight">Quiz App</h1>
        <p className="text-lg text-muted-foreground">
          Test your knowledge with interactive quizzes
        </p>
      </div>
      {!token ? (
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle>Welcome Back</CardTitle>
            <CardDescription>
              Sign in to your account to continue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {error && (
                <Alert variant={"destructive"}>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" className="w-full" disabled={isLogging}>
                {isLogging ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Welcome back!
                <Button variant={"outline"} size={"sm"} onClick={handleLogout}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </CardTitle>
              <CardDescription>
                Choose an option below to get started
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <Link href="/cards">
                  <Card className="transition-colors cursor-pointer hover:bg-accent/50">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <BookOpen className="w-8 h-8 text-primary" />
                        <div>
                          <h3 className="font-semibold">Manage Cards</h3>
                          <p className="text-sm text-muted-foreground">
                            Create and organize quiz questions
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>

                <Link href={"/quizzes"}>
                  <Card className="transition-colors cursor-pointer hover:bg-accent/50">
                    <CardContent className="p-6">
                      <div className="flex items-center space-x-4">
                        <Play className="w-8 h-8 text-primary" />
                        <div>
                          <h3 className="font-semibold">Start Quiz</h3>
                          <p className="font-semibold">
                            Take a quiz and test your knowledge
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
