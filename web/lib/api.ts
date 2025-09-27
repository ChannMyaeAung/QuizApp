export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:8081/api" ||
  "http//localhost:3031/api";

export async function startQuiz(userId: number, numQuestions: number) {
  const res = await fetch(`${API_URL}/quizzes`);
}
