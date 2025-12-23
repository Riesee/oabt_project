# Build Stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY *.go ./

RUN go build -o /oabt-backend

# Run Stage
FROM alpine:latest

WORKDIR /

COPY --from=builder /oabt-backend /oabt-backend

EXPOSE 8080

ENTRYPOINT ["/oabt-backend"]
