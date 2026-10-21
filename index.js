import "dotenv/config";
import { Client, GatewayIntentBits, Partials } from "discord.js";
import { closeDatabase, initializeDatabase } from "./db.js";
import { attachEvents } from "./events.js";

const token = process.env.DISCORD_TOKEN?.trim();
if (!token) {
  console.error("Configure DISCORD_TOKEN no arquivo .env antes de iniciar o bot.");
  process.exit(1);
}

await initializeDatabase();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember],
});
attachEvents(client);

let shuttingDown = false;
const shutdown = async (signal) => {
  if (shuttingDown) return;
  shuttingDown = true;
  console.info(`Encerrando após ${signal}.`);
  client.destroy();
  closeDatabase();
  process.exit(0);
};
process.once("SIGINT", () => void shutdown("SIGINT"));
process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.on("unhandledRejection", (error) => console.error("Falha assíncrona:", error?.message || "erro desconhecido"));

client.login(token).catch((error) => {
  console.error("Não foi possível conectar ao Discord. Confira o token e as permissões da aplicação.");
  console.error(error.message);
  closeDatabase();
  process.exit(1);
});
