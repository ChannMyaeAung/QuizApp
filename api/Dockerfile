# api/Dockerfile
# Use the official Go 1.24.5 image (or newer)
FROM golang:1.24.5-alpine AS builder

# Set your working directory
WORKDIR /app

# Copy only go.mod & go.sum and download dependencies
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of your code & build
COPY . .
RUN go build -o server ./cmd/server

# --------------------------------------------------------------------------------
# (Optional) If we want a slimmer runtime, do a second stage:
FROM alpine:latest
WORKDIR /app
COPY --from=builder /app/server ./
EXPOSE 8080
CMD ["./server"]
