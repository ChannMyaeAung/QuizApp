"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Plus, ArrowLeft } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface Card {
  id: number;
  question: string;
  correct_answer: string;
  wrong_answers: string[];
}

export default function CardsPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [question, setQuestion] = useState("");
  const [correct, setCorrect] = useState("");
  const [wrong, setWrong] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(`${API_URL}/cards`);
      if (res.ok) {
        const data = await res.json();
        const parsed: Card[] = data.map((c: any) => ({
          id: c.id,
          question: c.question,
          correct_answer: c.correct_answer,
          wrong_answers:
            typeof c.wrong_answers === "string"
              ? JSON.parse(c.wrong_answers)
              : c.wrong_answers,
        }));
        setCards(parsed);
      }
    } catch (error) {
      console.error("Failed to load cards:", error);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const wrongAnswers = wrong
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const res = await fetch(`${API_URL}/cards`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          correct_answer: correct,
          wrong_answers: wrongAnswers,
        }),
      });

      if (res.ok) {
        setQuestion("");
        setCorrect("");
        setWrong("");
        load();
      }
    } catch (error) {
      console.error("Failed to create card:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const del = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/cards/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        load();
      }
    } catch (error) {
      console.error("Failed to delete card:", error);
    }
  };

  return (
    <div className="quiz-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Cards</h1>
          <p className="text-muted-foreground">
            Create and organize your quiz questions
          </p>
        </div>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      {/* Create Card Form */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Plus className="w-5 h-5 mr-2" />
            Create New Card
          </CardTitle>
          <CardDescription>
            Add a new quiz question with multiple choice answers
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={create} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question</Label>
              <Input
                id="question"
                value={question}
                placeholder="Enter your question here..."
                onChange={(e) => setQuestion(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correct">Correct Answer</Label>
              <Input
                id="correct"
                value={correct}
                placeholder="Enter the correct answer here..."
                onChange={(e) => setCorrect(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wrong">Wrong Answers</Label>
              <Input
                id="wrong"
                value={wrong}
                placeholder="Enter wrong answers here..."
                onChange={(e) => setWrong(e.target.value)}
                required
              />
              <p className="text-sm text-muted-foreground">
                Separate multiple wrong answers with commas (e.g., Option A,
                Option B, Option C)
              </p>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Card"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Cards List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Your Cards ({cards.length})</h2>
        </div>

        {cards.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-muted-foreground">
                No cards yet. Create your first quiz question above!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {cards.map((card) => (
              <Card key={card.id} className="card-item">
                <CardContent>
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <h3 className="text-lg font-semibold">{card.question}</h3>

                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Badge variant="default">Correct</Badge>
                          <span>{card.correct_answer}</span>
                        </div>

                        <div className="flex items-start space-x-2">
                          <Badge variant={"secondary"}>Wrong</Badge>
                          <div className="flex flex-wrap gap-1">
                            {card.wrong_answers.map((answer, index) => (
                              <Badge key={index} variant={"outline"}>
                                {answer}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant={"destructive"}
                      size={"sm"}
                      onClick={() => del(card.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
