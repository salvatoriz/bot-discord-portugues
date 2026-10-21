import { Events } from "discord.js";
import { getSetting } from "./db.js";
import { commandPayloads } from "./commands.js";
import { handleInteraction } from "./router.js";
import { isMessageEventIgnored, logAction } from "./services/logging.js";

const renderMessage = (template, member) => template
  .replaceAll("{membro}", member.user.username)
  .replaceAll("{servidor}", member.guild.name)
  .replaceAll("{mencao}", `<@${member.id}>`);

export function attachEvents(client) {
  client.once(Events.ClientReady, async (readyClient) => {
    readyClient.application.commands.set(commandPayloads)
      .then(() => console.info(`${commandPayloads.length} comandos em português registrados.`))
      .catch((error) => console.error("Falha ao registrar os comandos do Discord:", error.message));
    console.info(`Bot conectado como ${readyClient.user.tag} em ${readyClient.guilds.cache.size} servidor(es).`);
  });

  client.on(Events.InteractionCreate, (interaction) => {
    void handleInteraction(interaction);
  });

  client.on(Events.GuildMemberAdd, async (member) => {
    const channelId = getSetting(member.guild.id, "welcome_channel");
    const channel = channelId ? await member.guild.channels.fetch(channelId).catch(() => null) : null;
    if (channel?.isTextBased()) {
      const template = getSetting(member.guild.id, "welcome_message", "Boas-vindas, {mencao}! Seja bem-vindo(a) a **{servidor}**.");
      const content = renderMessage(template, member);
      await channel.send({ content, allowedMentions: { users: [member.id] } }).catch((error) => console.error("Falha ao enviar boas-vindas:", error.message));
    }
    await logAction(member.guild, "membro_entrou", member.id, null, `${member.user.tag} entrou no servidor.`);
  });

  client.on(Events.GuildMemberRemove, async (member) => {
    const channelId = getSetting(member.guild.id, "goodbye_channel");
    const channel = channelId ? await member.guild.channels.fetch(channelId).catch(() => null) : null;
    if (channel?.isTextBased()) {
      const template = getSetting(member.guild.id, "goodbye_message", "{membro} saiu do servidor **{servidor}**.");
      const content = renderMessage(template, member);
      await channel.send({ content, allowedMentions: { parse: [] } }).catch((error) => console.error("Falha ao enviar despedida:", error.message));
    }
    await logAction(member.guild, "membro_saiu", member.id, null, `${member.user.tag} saiu do servidor.`);
  });

  client.on(Events.MessageDelete, async (message) => {
    if (!message.guild) return;
    if (await isMessageEventIgnored(message.guild, message.channelId, message.member, message.author?.id)) return;
    const content = message.partial ? "Conteúdo indisponível (mensagem parcial)." : (message.content || "[sem texto]");
    await logAction(
      message.guild,
      "mensagem_apagada",
      message.author?.id || null,
      null,
      `Mensagem apagada em ${message.channel}.\nAutor não identificado pelo evento de exclusão.\nConteúdo observado: ${content.slice(0, 900)}`,
    );
  });

  client.on(Events.MessageUpdate, async (before, after) => {
    if (!after.guild) return;
    if (await isMessageEventIgnored(after.guild, after.channelId, after.member, after.author?.id)) return;
    const oldContent = before.partial ? null : before.content;
    const newContent = after.partial ? null : after.content;
    if (oldContent === newContent) return;
    await logAction(
      after.guild,
      "mensagem_editada",
      after.author?.id || null,
      null,
      `Mensagem editada em ${after.channel}.\nAntes: ${(oldContent || "Conteúdo indisponível").slice(0, 700)}\nDepois: ${(newContent || "Conteúdo indisponível").slice(0, 700)}`,
    );
  });

  client.on(Events.GuildMemberUpdate, async (before, after) => {
    const roleChanges = [];
    const oldRoles = before.roles.cache;
    const newRoles = after.roles.cache;
    for (const role of newRoles.values()) if (!oldRoles.has(role.id)) roleChanges.push(`adicionado: ${role.name}`);
    for (const role of oldRoles.values()) if (!newRoles.has(role.id)) roleChanges.push(`removido: ${role.name}`);
    if (before.nickname !== after.nickname) {
      await logAction(after.guild, "apelido_alterado", after.id, null, `Apelido alterado: "${before.nickname || before.user.username}" → "${after.nickname || after.user.username}". Autor não identificado pelo evento.`);
    }
    if (roleChanges.length) {
      await logAction(after.guild, "cargos_alterados", after.id, null, `${roleChanges.join("; ")}. Autor não identificado pelo evento.`);
    }
  });

  client.on(Events.GuildCreate, (guild) => {
    void logAction(guild, "bot_adicionado", null, null, `O bot foi adicionado ao servidor ${guild.name}.`);
  });

  client.on(Events.Error, (error) => console.error("Erro do cliente Discord:", error.message));
}
