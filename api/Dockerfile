# api/Dockerfile
# Use the official Go 1.24.5 image (or newer)
FROM golang:1.24.5-alpine AS builder

# Set your working directory
WORKDIR /app

# Copy everything
COPY . .

# Tidy and download dependencies
RUN go mod tidy
RUN go build -o server ./cmd/server

# --------------------------------------------------------------------------------
# (Optional) If we want a slimmer runtime, do a second stage:
FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /app
COPY --from=builder /app/server ./
EXPOSE 8080
CMD ["./server"]
