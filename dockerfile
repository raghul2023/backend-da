FROM node:22.16-alpine

WORKDIR /app

# Copy npm-related files
COPY package.json package-lock.json ./

# Install dependencies using npm
RUN npm install

# Copy the rest of your code
COPY . .

# Build the app using npm
RUN npm run build

CMD ["npm","run","start:dev"]
