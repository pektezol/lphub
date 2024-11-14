FROM golang:1.23.0-alpine3.20 AS lphub

WORKDIR /app

COPY backend .

RUN go install github.com/air-verse/air@latest
RUN go mod download

CMD ["air"]
