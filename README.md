# QuizApp

A Quizz App to practice/hone what I have learnt so far in Go and MySQL. The Backend API was deployed on Railway on free tier so it might take a bit while to fetch the data.

Demo Link: https://quiz-app-by-chan.vercel.app/

I haven't implemented Login/Auth feature yet. So to test this, use the following test email that I added to my database:
For testing, use 'test@example.com', 'dummy'

**Testing the API in Postman (GET):**

![Postman_GET](Imgs\Postman_GET.png)

**DELETE**

![Postman_DELETE](Imgs\Postman_DELETE.png)

## Frontend

The `web` directory contains a simple frontend built with Next.js 15 and React 19.
Install dependencies and start the development server:

```bash
cd web
npm install
npm run dev
```

For Running locally using Docker: Set `NEXT_PUBLIC_API_URL` to point at the running API service (defaults to `http://localhost:8080`).
