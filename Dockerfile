# Stage 1: Build the application
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the Next.js application and compile TypeScript
RUN npm run build

# Stage 2: Run the application
FROM node:18-alpine AS runner

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production

# Copy built application from the builder stage
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/dist ./dist

# Expose the ports the app runs on
EXPOSE 3000
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
