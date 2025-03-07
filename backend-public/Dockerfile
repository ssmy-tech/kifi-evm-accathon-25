# Use the official Node.js image as a base
FROM node:20

# Set the working directory
WORKDIR /usr/src/app

# Copy package files first
COPY package*.json ./

# Create prisma directory and copy schema
RUN mkdir -p prisma
COPY prisma/schema.prisma ./prisma/

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

# Expose the application port
EXPOSE 4000

# Command to run the application
CMD ["npm", "run", "start:prod"]