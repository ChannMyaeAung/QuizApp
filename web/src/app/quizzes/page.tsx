"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Trophy,
  Clock,
} from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8081";

interface QuizQuestion {
  card_id: number;
  position: number;
}

interface QuizData {
  user_id: number;
  score: number;
  started_at: string;
  finished_at?: string;
  questions: QuizQuestion[];
}

interface CardData {
  id: number;
  question: string;
  correct_answer: string;
  wrong_answers: string[];
}

interface Answer {
  card_id: number;
  selected_answer: string;
  is_correct: boolean;
  correct_answer: string;
}

export default function QuizzesPage() {
  // Quiz State
  const [quizId, setQuizId] = useState<number | null>(null);
  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState<CardData | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [showResult, setShowResult] = useState(false);
  const [quizComplete, setQuizComplete] = useState(false);

  // UI State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [startTime, setStartTime] = useState<Date | null>(null);

  // Get user ID from token
  const getUserId = (): number => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split(".")[1]));
          return payload.sub || 1;
        } catch {
          return 1; // Fallback
        }
      }
    }
    return 1; // Ensure a number is always returned
  };

  // Start a new quiz
  const startQuiz = async () => {
    setLoading(true);
    setError("");

    try {
      const userId = getUserId();
      const res = await fetch(`${API_URL}/quizzes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          num_questions: 10,
        }),
      });
      if (!res.ok) throw new Error("Failed to start quiz");

      const data = await res.json();
      setQuizId(data.quiz_id);
      setStartTime(new Date());
    } catch (err) {
      setError("Failed to start quiz. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Load quiz data and first question
  const loadQuizData = async (id: number) => {
    try {
      const res = await fetch(`${API_URL}/quizzes/${id}`);
      if (!res.ok) throw new Error("Failed to load quiz");

      const data: QuizData = await res.json();
      setQuizData(data);

      if (data.questions.length > 0) {
        await loadQuestion(data.questions[0].card_id);
      }
    } catch (err) {
      setError("Failed to load quiz data");
    }
  };

  // Load specific question/card data
  const loadQuestion = async (cardId: number) => {
    try {
      const res = await fetch(`${API_URL}/cards`);
      if (!res.ok) throw new Error("Failed to load question");

      const cards = await res.json();
      const card = cards.find((c: any) => c.id === cardId);

      if (card) {
        const parsedCard: CardData = {
          id: card.id,
          question: card.question,
          correct_answer: card.correct_answer,
          wrong_answers:
            typeof card.wrong_answers === "string"
              ? JSON.parse(card.wrong_answers)
              : card.wrong_answers,
        };
        setCurrentCard(parsedCard);
      }
    } catch (err) {
      setError("Failed to load question");
    }
  };

  return (
    <div className="quiz-container">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quiz Challenge</h1>
          <p className="text-muted-foreground">
            Test your knowledge and see how well you perform!
          </p>
        </div>

        <Link href="/">
          <Button variant={"outline"}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>
      </div>

      {error && (
        <Alert variant={"destructive"} className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Quiz States */}
      {!quizId ? (
        // Start Quiz
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span>Ready for a Challenge?</span>
            </CardTitle>
            <CardDescription>
              Test your knowledge with 10 random questions. Good luck!
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <Button onClick={startQuiz} disabled={loading} size="lg">
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Quiz...
                </>
              ) : (
                "Start Quiz"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : quizComplete ? (
        // Quiz Results
        <Card></Card>
      ) : (
        // Active Quiz
        <div></div>
      )}
    </div>
  );
}
