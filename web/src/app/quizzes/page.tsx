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

const API_URL = process.env.NEXT_PUBLIC_API_URL;
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
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

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

      await loadQuizData(data.quiz_id);
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

  // Generate shuffled options once when card loads
  const generateShuffledOptions = (card: CardData): string[] => {
    const options = [card.correct_answer, ...card.wrong_answers];
    // Shuffle array once and store it
    return options.sort(() => Math.random() - 0.5);
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

        setShuffledOptions(generateShuffledOptions(parsedCard));
      } else {
        setError(`Question with ID ${cardId} not found`);
      }
    } catch (err) {
      setError("Failed to load question");
    }
  };

  // Submit answer for current question
  const submitAnswer = async () => {
    if (!selectedAnswer || !quizId || !currentCard) return;

    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/quizzes/${quizId}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_id: currentCard.id,
          answer_text: selectedAnswer,
        }),
      });
      if (!res.ok) throw new Error("Failed to submit answer");

      const result = await res.json();

      // Store answer result
      const answerData: Answer = {
        card_id: currentCard.id,
        selected_answer: selectedAnswer,
        is_correct: result.correct,
        correct_answer: currentCard.correct_answer,
      };
      setAnswers((prev) => [...prev, answerData]);
      setShowResult(true);

      // auto-advance after showing result
      setTimeout(() => {
        nextQuestion();
      }, 2000);
    } catch (err) {
      setError("Failed to submit answer");
    } finally {
      setLoading(false);
    }
  };

  // Move to next question
  const nextQuestion = () => {
    if (!quizData) return;

    const nextIndex = currentQuestionIndex + 1;
    if (nextIndex >= quizData.questions.length) {
      // Quiz Complete
      setQuizComplete(true);
    } else {
      // Load next question
      setCurrentQuestionIndex(nextIndex);
      setSelectedAnswer("");
      setShowResult(false);
      setShuffledOptions([]); // Clear previous options
      loadQuestion(quizData.questions[nextIndex].card_id);
    }
  };

  // Calculate final score
  const getFinalScore = () => {
    const correct = answers.filter((a) => a.is_correct).length;
    return { correct, total: answers.length };
  };

  // Calculate time taken
  const getTimeTaken = () => {
    if (!startTime) return "0:00";
    const seconds = Math.floor((Date.now() - startTime.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  const progress = quizData
    ? ((currentQuestionIndex + 1) / quizData.questions.length) * 100
    : 0;
  const answerOptions = shuffledOptions;
  const { correct, total } = getFinalScore();

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
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center space-x-2">
              <Trophy className="w-6 h-6 text-yellow-500" />
              <span>Quiz Complete!</span>
            </CardTitle>
            <CardDescription>Here are your results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Score Summary */}
            <div className="space-y-4 text-center">
              <div className="text-4xl font-bold text-primary">
                {correct}/{total}
              </div>
              <div className="text-xl text-muted-foreground">
                {Math.round((correct / total) * 100)}% Correct
              </div>
              <div className="flex items-center justify-center space-x-4 text-sm text-muted-foreground">
                <div className="flex items-center">
                  <Clock className="w-4 h-4 mr-1" />
                  {getTimeTaken()}
                </div>
              </div>
            </div>

            {/* Detailed Results */}
            <div className="space-y-3">
              <h3 className="font-semibold">Question Results:</h3>
              <div className="space-y-2 overflow-y-auto max-h-60">
                {answers.map((answer, index) => (
                  <div
                    key={answer.card_id}
                    className="flex items-center justify-between p-3 border rounded-lg bg-card"
                  >
                    <span className="text-sm font-medium">
                      Question {index + 1}
                    </span>
                    <div className="flex items-center space-x-2">
                      {answer.is_correct ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      <Badge
                        variant={answer.is_correct ? "default" : "destructive"}
                        className="text-xs"
                      >
                        {answer.is_correct ? "Correct" : "Wrong"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-4">
              <Button
                onClick={() => window.location.reload()}
                className="flex-1"
              >
                Take Another Quiz
              </Button>
              <Link href={"/"}>
                <Button variant={"outline"} className="w-full">
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Active Quiz
        <div>
          {/* Progress */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Question {currentQuestionIndex + 1} of{" "}
                  {quizData?.questions.length || 0}
                </span>
                <span className="text-sm text-muted-foreground">
                  {getTimeTaken()}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </CardContent>
          </Card>
          {/* Current Question */}
          {currentCard && shuffledOptions.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">
                  {currentCard.question}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Answer Options - USE shuffledOptions instead of answerOptions */}
                <div className="space-y-2">
                  {shuffledOptions.map((option, index) => (
                    <Button
                      key={index}
                      variant={
                        selectedAnswer === option ? "default" : "outline"
                      }
                      className="justify-start w-full h-auto p-4 text-left"
                      onClick={() => !showResult && setSelectedAnswer(option)}
                      disabled={showResult || loading}
                    >
                      <span className="mr-3 font-mono">
                        {String.fromCharCode(65 + index)}.
                      </span>
                      {option}
                    </Button>
                  ))}
                </div>

                {/* Submit Button */}
                {!showResult && (
                  <Button
                    onClick={submitAnswer}
                    disabled={!selectedAnswer || loading}
                    className="w-full"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Submit Answer"
                    )}
                  </Button>
                )}

                {/* Answer Result */}
                {showResult && answers.length > 0 && (
                  <Alert
                    variant={
                      answers[answers.length - 1].is_correct
                        ? "default"
                        : "destructive"
                    }
                    className="border-l-4"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {answers[answers.length - 1].is_correct ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <XCircle className="w-5 h-5 text-red-600" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="mb-1 font-medium">
                          {answers[answers.length - 1].is_correct
                            ? "Correct Answer! 🎉"
                            : "Incorrect Answer"}
                        </div>
                        <AlertDescription className="text-sm">
                          {answers[answers.length - 1].is_correct ? (
                            "Well done! You got it right."
                          ) : (
                            <div className="space-y-1">
                              <div>
                                Your answer:{" "}
                                <span className="font-medium text-red-600">
                                  {selectedAnswer}
                                </span>
                              </div>
                              <div>
                                Correct answer:{" "}
                                <span className="font-medium text-green-600">
                                  {answers[answers.length - 1].correct_answer}
                                </span>
                              </div>
                            </div>
                          )}
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>
                )}
              </CardContent>
            </Card>
          ) : (
            // Loading question
            <Card>
              <CardContent className="p-8 text-center">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" />
                <p className="text-muted-foreground">Loading question...</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
