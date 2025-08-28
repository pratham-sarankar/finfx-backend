# Use Node.js 24 (matches your local version)
FROM node:24

# Create app directory
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if exists)
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy rest of the app source code
COPY . .

# Build TypeScript -> dist/
RUN npm run build

# Expose port (make sure this matches your Express port, usually 8080 or 3000)
EXPOSE 8080

# Start the app
CMD ["node", "dist/app.js"]
