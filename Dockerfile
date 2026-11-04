FROM golang:1.26-alpine AS lphub

WORKDIR /app
COPY backend/go.mod backend/go.sum ./
RUN go mod download && go install github.com/air-verse/air@v1.63.0
COPY backend .
CMD ["air"]
