FROM node:20-alpine

WORKDIR /app

# Copy dependency configs
COPY package*.json ./

# Install npm dependencies
RUN npm install

# Copy source code
COPY . .

# Expose port 3000 for Vite React server
EXPOSE 3000

# Start Vite dev server on all host interfaces
CMD ["npm", "run", "dev", "--", "--host"]
