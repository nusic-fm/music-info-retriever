FROM node:18.0.0

# RUN mkdir -p /home/node/app/node_modules && chown -R node:node /home/node/app

WORKDIR /app

# WORKDIR /home/node/app

COPY package*.json ./
COPY tsconfig.json ./
# COPY package-lock.json ./
# COPY yarn.lock ./

# USER node

# RUN yarn --frozen-lockfile
RUN npm ci\
    && npm i typescript -g

COPY . .

RUN tsc

# COPY --chown=node:node . .

CMD node dist/index.js


# docker build .
# docker run <image>
# docker ps
# docker stop <containerid>