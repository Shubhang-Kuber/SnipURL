# SnipURL — single Express process serving the API and the static frontend.
FROM node:20-alpine

# server.js resolves the frontend as path.join(__dirname, "..", "frontend"),
# so backend and frontend must land as siblings under /app.
WORKDIR /app/backend

# Copy only the manifest files first so `npm install` is cached in its own
# layer and only re-runs when dependencies actually change, not on every
# source edit.
COPY backend/package.json backend/package-lock.json ./
RUN npm install --omit=dev

# Now bring in the rest of the backend source and the static frontend it
# serves via express.static. backend/.env is excluded via .dockerignore —
# all DB credentials are supplied at `docker run` time with -e flags.
COPY backend/ ./
COPY frontend/ /app/frontend/

EXPOSE 3000

CMD ["node", "server.js"]
