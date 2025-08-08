"use client";

import { useEffect, useState } from "react";

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

  const load = async () => {
    const res = await fetch(`${API_URL}/cards`);
    if (res.ok) {
      const data = await res.json();
      const parsed: Card[] = data.map((c: any) => ({
        id: c.id,
        question: c.question,
        correct_answer: c.correct_answer,
        wrong_answers: JSON.parse(c.wrong_answers),
      }));
      setCards(parsed);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    const wrongAnswers = wrong
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    await fetch(`${API_URL}/cards`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        question,
        correct_answer: correct,
        wrong_answers: wrongAnswers,
      }),
    });
    setQuestion("");
    setCorrect("");
    setWrong("");
    load();
  };

  const del = async (id: number) => {
    await fetch(`${API_URL}/cards/${id}`, {
      method: "DELETE",
    });
    load();
  };

  return (
    <main>
      <h1>Cards</h1>
      <form onSubmit={create}>
        <input
          value={question}
          placeholder="Question"
          onChange={(e) => setQuestion(e.target.value)}
        />
        <input
          value={correct}
          placeholder="Correct Answer"
          onChange={(e) => setCorrect(e.target.value)}
        />
        <input
          value={wrong}
          placeholder="Wrong Answers (comma separated)"
          onChange={(e) => setWrong(e.target.value)}
        />
        <button type="submit">Create</button>
      </form>
      <ul>
        {cards.map((c) => (
          <li key={c.id}>
            <strong>{c.question}</strong>
            <button onClick={() => del(c.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </main>
  );
}
