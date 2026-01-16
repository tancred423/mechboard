FROM denoland/deno:2.5.6

WORKDIR /app

COPY deno.json .
RUN deno install

COPY src/ src/
COPY drizzle/ drizzle/

RUN deno cache src/main.ts

EXPOSE 8000

CMD ["deno", "task", "start"]
