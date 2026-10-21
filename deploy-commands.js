import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commandPayloads } from "./commands.js";

const token = process.env.DISCORD_TOKEN?.trim();
const clientId = process.env.DISCORD_CLIENT_ID?.trim();
if (!token || !clientId) {
  console.error("Configure DISCORD_TOKEN e DISCORD_CLIENT_ID no arquivo .env.");
  process.exit(1);
}

const rest = new REST({ version: "10" }).setToken(token);
try {
  await rest.put(Routes.applicationCommands(clientId), { body: commandPayloads });
  console.info(`${commandPayloads.length} comandos registrados. Comandos globais podem levar alguns minutos para aparecer.`);
} catch (error) {
  console.error("Falha ao registrar comandos:", error.message);
  process.exit(1);
}
