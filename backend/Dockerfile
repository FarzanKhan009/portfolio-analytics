FROM node:20-alpine

WORKDIR /app

# Copy package manifests
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production

# Copy source code and scripts
COPY . .

# Expose backend port
EXPOSE 51773

# Start the analytics backend
CMD ["node", "src/index.js"]
