import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
  EmbedBuilder,
  FileUploadBuilder,
  GatewayIntentBits,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} from "discord.js";
import { all, get, getGlobalSetting, getSetting, run, setGlobalSetting, setSetting } from "./db.js";
import { commandPayloads } from "./commands.js";
import { OWNER_ID, canConfigureGuild, isOwner, requireGuild, requirePermission } from "./permissions.js";
import { handleFunCommand } from "./services/fun.js";
import { handleModerationCommand } from "./services/moderation.js";
import { handleReviewCommand, saveReview, showReviewCommentModal } from "./services/reviews.js";
import { logAction } from "./services/logging.js";
import {
  changeTicketParticipant,
  closeTicket,
  getCurrentTicket,
  handleCloseConfirmation,
  handleParticipantModal,
  handleTicketPanelButton,
  openTicket,
  publishTicketPanel,
  sendTicketStats,
  setupRows,
  ticketConfigurationPreview,
} from "./services/tickets.js";
import { removeBanner, saveBanner } from "./services/banner.js";

const fmtDuration = (ms) => {
  const seconds = Math.floor(ms / 1000);
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${days}d ${hours}h ${minutes}min`;
};
const ticketSetupModal = (field, title, label, value = "") => new ModalBuilder()
  .setCustomId(`ticket-config-modal:${field}`)
  .setTitle(title)
  .addComponents(new ActionRowBuilder().addComponents(
    new TextInputBuilder().setCustomId("valor").setLabel(label).setStyle(TextInputStyle.Paragraph)
      .setRequired(true).setMaxLength(field === "titulo" ? 100 : 1000).setValue(value.slice(0, field === "titulo" ? 100 : 1000)),
  ));

async function replyError(interaction, error) {
  const technicalErrors = new Set(["DiscordAPIError", "HTTPError", "RESTJSONError", "TypeError", "RangeError", "SyntaxError", "FetchError"]);
  const message = error instanceof Error && !technicalErrors.has(error.constructor.name)
    ? error.message
    : "O Discord não aceitou a solicitação. Confira as permissões do bot, a hierarquia de cargos e as opções informadas.";
  const payload = { content: `Não foi possível concluir a ação: ${message}`, ephemeral: true };
  if (interaction.deferred) return interaction.editReply(payload);
  if (interaction.replied) return interaction.followUp(payload);
  return interaction.reply(payload);
}

async function handlePublic(interaction) {
  const name = interaction.commandName;
  if (name === "ajuda") {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("Ajuda — comandos do bot")
        .setDescription([
          "**Geral:** `/ping`, `/sobre`, `/avatar`, `/usuario`, `/servidor`, `/cargo`, `/membros`, `/tempoativo`, `/convite`, `/suporte`.",
          "**Moderação:** `/banir`, `/desbanir`, `/expulsar`, `/castigar`, `/descastigar`, `/advertir`, `/advertencias`, `/limpar`, `/lentidao`, `/trancar`, `/destrancar`, `/apelido`, `/historico`.",
          "**Atendimentos:** `/ingressos configurar`, `/ingressos painel`, `/ingressos adicionar`, `/ingressos remover`, `/ingressos fechar`, `/ingressos reabrir`, `/ingressos assumir`, `/ingressos transcricao`, `/ingressos estatisticas`.",
          "**Avaliações:** `/avaliar`, `/avaliacoes configurar`, `/avaliacoes painel`, `/avaliacoes estatisticas`, `/avaliacoes usuario`, `/avaliacoes exportar`.",
          "**Diversão:** `/meme`, `/gif`, `/anime`, `/abracar`, `/cafune`, `/comprimentar`, `/moeda`, `/escolher`, `/enquete`, `/piada`, `/curiosidade`, `/frase`, `/bola8`.",
          "**Registros e mensagens:** `/registros`, `/boasvindas`, `/despedidas`.",
          "As ações administrativas verificam permissões do Discord e a hierarquia de cargos.",
        ].join("\n\n"))],
      ephemeral: true,
    });
  }
  if (name === "ping") return interaction.reply(`🏓 Pong! Latência: ${Math.round(interaction.client.ws.ping)} ms.`);
  if (name === "sobre") {
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle("Bot de atendimento e moderação")
        .setDescription("Um bot de servidor em português com comandos de utilidade, moderação, atendimentos privados, avaliações e registros.")
        .addFields(
          { name: "Versão do Node.js", value: process.version, inline: true },
          { name: "Servidores", value: String(interaction.client.guilds.cache.size), inline: true },
        )],
      ephemeral: true,
    });
  }
  if (name === "avatar") {
    const user = interaction.options.getUser("membro") || interaction.user;
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(`Avatar de ${user.tag}`).setImage(user.displayAvatarURL({ size: 1024 }))] });
  }
  if (name === "usuario") {
    const user = interaction.options.getUser("membro") || interaction.user;
    const member = interaction.guild ? await interaction.guild.members.fetch(user.id).catch(() => null) : null;
    const embed = new EmbedBuilder().setColor(0x5865f2).setTitle(`Informações de ${user.tag}`)
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: "ID", value: user.id, inline: true },
        { name: "Conta criada", value: `<t:${Math.floor(user.createdTimestamp / 1000)}:R>`, inline: true },
      );
    if (member) embed.addFields({ name: "Entrou no servidor", value: member.joinedTimestamp ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Não informado", inline: true });
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
  if (name === "servidor") {
    requireGuild(interaction);
    const guild = interaction.guild;
    const owner = await guild.fetchOwner().catch(() => null);
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setTitle(guild.name).setThumbnail(guild.iconURL({ size: 256 }))
        .addFields(
          { name: "Proprietário", value: owner ? owner.user.tag : "Não disponível", inline: true },
          { name: "Membros", value: String(guild.memberCount), inline: true },
          { name: "Criado", value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:D>`, inline: true },
          { name: "Canais", value: String(guild.channels.cache.size), inline: true },
        )],
      ephemeral: true,
    });
  }
  if (name === "cargo") {
    const role = interaction.options.getRole("cargo");
    return interaction.reply({
      embeds: [new EmbedBuilder().setColor(role.color || 0x64748b).setTitle(`Cargo ${role.name}`)
        .addFields(
          { name: "ID", value: role.id, inline: true },
          { name: "Membros", value: String(role.members.size), inline: true },
          { name: "Posição", value: String(role.position), inline: true },
        )],
      ephemeral: true,
    });
  }
  if (name === "membros") return interaction.reply(`Este servidor tem **${interaction.guild.memberCount}** membro(s).`);
  if (name === "tempoativo") return interaction.reply(`Estou ativo há **${fmtDuration(interaction.client.uptime || 0)}**.`);
  if (name === "convite") {
    const url = process.env.INVITE_URL || await interaction.client.generateInvite({
      scopes: ["bot", "applications.commands"],
      permissions: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.EmbedLinks,
        PermissionFlagsBits.AttachFiles,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ManageMessages,
        PermissionFlagsBits.KickMembers,
        PermissionFlagsBits.BanMembers,
        PermissionFlagsBits.ModerateMembers,
        PermissionFlagsBits.ManageNicknames,
      ],
    });
    return interaction.reply({ content: `[Adicionar o bot a um servidor](${url})`, ephemeral: true });
  }
  if (name === "suporte") {
    const requestedChannel = interaction.options.getChannel("canal");
    const requestedUrl = interaction.options.getString("link")?.trim();
    if (requestedChannel || requestedUrl) {
      requirePermission(interaction, PermissionFlagsBits.ManageGuild);
      if (requestedChannel) setSetting(interaction.guildId, "support_channel", requestedChannel.id);
      if (requestedUrl) {
        let parsed;
        try { parsed = new URL(requestedUrl); } catch { throw new Error("Informe um link HTTPS válido."); }
        if (parsed.protocol !== "https:") throw new Error("O link de suporte precisa começar com https://.");
        setSetting(interaction.guildId, "support_url", parsed.toString());
      }
      return interaction.reply({ content: "Configuração de suporte atualizada para este servidor.", ephemeral: true });
    }
    const channelId = getSetting(interaction.guildId, "support_channel");
    const channel = channelId && interaction.guild ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
    const url = getSetting(interaction.guildId, "support_url", process.env.SUPPORT_URL);
    const content = [channel ? `Canal de suporte: ${channel}` : null, url ? `[Central de suporte](${url})` : null]
      .filter(Boolean).join("\n");
    return interaction.reply({ content: content || "O suporte ainda não foi configurado. Peça ajuda a um administrador do servidor.", ephemeral: true });
  }
}

async function handleTicketCommand(interaction) {
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "configurar") {
    canConfigureGuild(interaction);
    const channel = interaction.options.getChannel("canal");
    const category = interaction.options.getChannel("categoria");
    const role = interaction.options.getRole("cargo_equipe");
    const logsChannel = interaction.options.getChannel("canal_registros");
    const title = interaction.options.getString("titulo");
    const description = interaction.options.getString("descricao");
    const banner = interaction.options.getAttachment("banner");
    const duplicatePolicy = interaction.options.getBoolean("permitir_duplicados");
    if (channel) setSetting(interaction.guildId, "ticket_panel_channel", channel.id);
    if (category) setSetting(interaction.guildId, "ticket_category", category.id);
    if (role) setSetting(interaction.guildId, "ticket_staff_role", role.id);
    if (logsChannel) setSetting(interaction.guildId, "logs_channel", logsChannel.id);
    if (title) setSetting(interaction.guildId, "ticket_title", title);
    if (description) setSetting(interaction.guildId, "ticket_description", description);
    if (duplicatePolicy !== null) setSetting(interaction.guildId, "ticket_allow_duplicates", String(duplicatePolicy));
    if (banner) await saveBanner(interaction.guildId, banner);
    const target = channel ? `\nCanal do painel: ${channel}` : "";
    return interaction.reply({
      content: `Configurações salvas para este servidor.${target}\nEdite o título, a descrição e o banner pelos botões. Use **Salvar alterações** e depois **Publicar painel**.`,
      components: setupRows(),
      ephemeral: true,
    });
  }

  if (subcommand === "painel") {
    canConfigureGuild(interaction);
    const channel = interaction.options.getChannel("canal")
      || await interaction.guild.channels.fetch(getSetting(interaction.guildId, "ticket_panel_channel")).catch(() => null);
    if (!channel?.isTextBased()) throw new Error("Informe um canal válido ou configure-o antes.");
    if (channel.guildId !== interaction.guildId) throw new Error("O canal precisa pertencer a este servidor.");
    const result = await publishTicketPanel(interaction, channel);
    return interaction.reply({ content: `Painel ${result.updated ? "atualizado" : "publicado"} em ${channel}.`, ephemeral: true });
  }

  if (subcommand === "estatisticas") {
    canConfigureGuild(interaction);
    return sendTicketStats(interaction);
  }

  const ticket = getCurrentTicket(interaction.channelId);
  if (!ticket || ticket.guild_id !== interaction.guildId) throw new Error("Use este comando dentro de um canal de atendimento.");
  if (subcommand === "adicionar" || subcommand === "remover") {
    const user = interaction.options.getUser("membro");
    await changeTicketParticipant(interaction, ticket, user.id, subcommand);
    return interaction.reply({ content: `${user} foi ${subcommand === "adicionar" ? "adicionado ao" : "removido do"} atendimento.`, ephemeral: true });
  }
  if (subcommand === "fechar") return closeTicket(interaction, ticket);
  if (subcommand === "reabrir") {
    const { handleTicketPanelButton } = await import("./services/tickets.js");
    await handleTicketPanelButton(interaction, "reabrir", ticket.id);
    return interaction.reply({ content: "Atendimento reaberto.", ephemeral: true });
  }
  if (subcommand === "assumir") {
    const { handleTicketPanelButton } = await import("./services/tickets.js");
    await handleTicketPanelButton(interaction, "assumir", ticket.id);
    return interaction.reply({ content: "Você assumiu este atendimento.", ephemeral: true });
  }
  if (subcommand === "transcricao") {
    const isStaff = interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
      interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
      interaction.member.roles.cache.has(getSetting(interaction.guildId, "ticket_staff_role"));
    if (interaction.user.id !== ticket.user_id && !isStaff) throw new Error("Somente o autor do atendimento ou a equipe pode gerar a transcrição.");
    const { makeTranscript } = await import("./services/tickets.js");
    return makeTranscript(interaction, ticket);
  }
}

async function handleTicketConfigButton(interaction, action) {
  canConfigureGuild(interaction);
  if (action === "titulo") return interaction.showModal(ticketSetupModal("titulo", "Editar título", "Título do painel", getSetting(interaction.guildId, "ticket_title", "Central de atendimentos")));
  if (action === "descricao") return interaction.showModal(ticketSetupModal("descricao", "Editar descrição", "Texto de apresentação", getSetting(interaction.guildId, "ticket_description", "Precisa de ajuda? Abra um atendimento privado.")));
  if (action === "banner") {
    const modal = new ModalBuilder().setCustomId("ticket-config-modal:banner").setTitle("Adicionar ou trocar banner")
      .addComponents(new ActionRowBuilder().addComponents(
        new FileUploadBuilder().setCustomId("arquivo").setMinValues(1).setMaxValues(1).setRequired(true),
      ));
    return interaction.showModal(modal);
  }
  if (action === "remover-banner") {
    await removeBanner(interaction.guildId);
    return interaction.reply({ content: "Banner removido. Salve e publique o painel para atualizar a mensagem.", ephemeral: true });
  }
  if (action === "visualizar") return ticketConfigurationPreview(interaction);
  if (action === "salvar") return interaction.reply({ content: "As alterações já foram salvas no banco persistente deste servidor.", ephemeral: true });
  if (action === "publicar") {
    const channel = await interaction.guild.channels.fetch(getSetting(interaction.guildId, "ticket_panel_channel")).catch(() => null);
    if (!channel?.isTextBased()) throw new Error("Configure um canal de painel válido primeiro.");
    const result = await publishTicketPanel(interaction, channel);
    return interaction.reply({ content: `Painel ${result.updated ? "atualizado" : "publicado"} em ${channel}.`, ephemeral: true });
  }
}

async function handleOwner(interaction) {
  if (!isOwner(interaction.user.id)) throw new Error("Este comando é exclusivo do proprietário autorizado do bot.");
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "ajuda") {
    return interaction.reply({ content: "Comandos do proprietário: `/dono ajuda`, `/dono status`, `/dono estatisticas`, `/dono servidores`, `/dono informacoes`, `/dono manutencao`, `/dono configuracao`, `/dono diagnostico` e `/dono recarregar`.", ephemeral: true });
  }
  if (subcommand === "status") {
    return interaction.reply({ content: `Bot conectado: **sim**\nServidores: **${interaction.client.guilds.cache.size}**\nLatência: **${Math.round(interaction.client.ws.ping)} ms**\nTempo ativo: **${fmtDuration(interaction.client.uptime || 0)}**\nManutenção: **${getGlobalSetting("maintenance", "false") === "true" ? "ativa" : "inativa"}**`, ephemeral: true });
  }
  if (subcommand === "estatisticas") {
    const guilds = interaction.client.guilds.cache;
    const memberCount = guilds.reduce((sum, guild) => sum + (guild.memberCount || 0), 0);
    return interaction.reply({ content: `Servidores: **${guilds.size}**\nMembros informados pelos servidores: **${memberCount}**\nComandos: **${commandPayloads.length}**\nUso de memória: **${Math.round(process.memoryUsage().rss / 1024 / 1024)} MB**`, ephemeral: true });
  }
  if (subcommand === "servidores") {
    const guilds = [...interaction.client.guilds.cache.values()];
    const csv = ["servidor,id,membros", ...guilds.map((guild) => [guild.name, guild.id, guild.memberCount].map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(","))].join("\r\n");
    return interaction.reply({
      content: `Lista dos ${guilds.length} servidor(es) em que o bot está:`,
      files: [new AttachmentBuilder(Buffer.from(`\uFEFF${csv}`, "utf8"), { name: "servidores-do-bot.csv" })],
      ephemeral: true,
    });
  }
  if (subcommand === "informacoes") {
    return interaction.reply({ content: `Node.js: ${process.version}\ndiscord.js: ${interaction.client.constructor.version}\nPlataforma: ${process.platform}\nProcesso ativo: ${fmtDuration(interaction.client.uptime || 0)}\nIdentificador autorizado: ${OWNER_ID}`, ephemeral: true });
  }
  if (subcommand === "manutencao") {
    const enable = interaction.options.getBoolean("ativar");
    setGlobalSetting("maintenance", String(enable));
    return interaction.reply({ content: `Modo de manutenção ${enable ? "ativado" : "desativado"}.`, ephemeral: true });
  }
  if (subcommand === "configuracao") {
    const configured = ["BOT_DB_PATH", "BOT_DATA_DIR", "INVITE_URL", "SUPPORT_URL"].filter((key) => Boolean(process.env[key]));
    return interaction.reply({ content: `ID do proprietário: ${OWNER_ID}\nComandos registrados: ${commandPayloads.length}\nConfigurações opcionais presentes: ${configured.join(", ") || "nenhuma"}\nO token e outros segredos não são exibidos.`, ephemeral: true });
  }
  if (subcommand === "diagnostico") {
    const checks = [
      `Banco aberto: ${Boolean(get("SELECT 1 AS ok")) ? "sim" : "não"}`,
      `Gateway conectado: ${interaction.client.isReady() ? "sim" : "não"}`,
      `Intenção de membros habilitada: ${interaction.client.options.intents.has(GatewayIntentBits.GuildMembers) ? "sim" : "não"}`,
      `Intenção de conteúdo habilitada: ${interaction.client.options.intents.has(GatewayIntentBits.MessageContent) ? "sim" : "não"}`,
      `Canais de log sem configuração: ${interaction.client.guilds.cache.filter((guild) => !getSetting(guild.id, "logs_channel")).size}`,
    ];
    return interaction.reply({ content: checks.join("\n"), ephemeral: true });
  }
  if (subcommand === "recarregar") {
    await interaction.client.application.commands.set(commandPayloads);
    return interaction.reply({ content: `Lista de ${commandPayloads.length} comandos publicada novamente. O Discord pode levar algum tempo para propagar comandos globais.`, ephemeral: true });
  }
}

async function handleGuildSettings(interaction) {
  requirePermission(interaction, PermissionFlagsBits.ManageGuild);
  const group = interaction.commandName;
  const subcommand = interaction.options.getSubcommand();
  const prefix = group === "boasvindas" ? "welcome" : "goodbye";
  if (subcommand === "configurar") {
    const channel = interaction.options.getChannel("canal");
    const message = interaction.options.getString("mensagem");
    setSetting(interaction.guildId, `${prefix}_channel`, channel.id);
    if (message) setSetting(interaction.guildId, `${prefix}_message`, message);
    return interaction.reply({ content: `Canal de ${group === "boasvindas" ? "boas-vindas" : "despedidas"} configurado${message ? " e mensagem salva" : ""}.`, ephemeral: true });
  }
  if (subcommand === "mensagem") {
    const message = interaction.options.getString("texto");
    setSetting(interaction.guildId, `${prefix}_message`, message);
    return interaction.reply({ content: "Mensagem salva. Variáveis disponíveis: `{membro}`, `{servidor}` e `{mencao}`.", ephemeral: true });
  }
  if (subcommand === "testar") {
    const channelId = getSetting(interaction.guildId, `${prefix}_channel`);
    const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
    if (!channel?.isTextBased()) throw new Error("Configure primeiro um canal de texto válido.");
    const template = getSetting(interaction.guildId, `${prefix}_message`,
      prefix === "welcome" ? "Boas-vindas, {mencao}! Seja bem-vindo(a) a **{servidor}**." : "{membro} saiu do servidor **{servidor}**.");
    const rendered = template.replaceAll("{membro}", interaction.user.username).replaceAll("{servidor}", interaction.guild.name).replaceAll("{mencao}", `<@${interaction.user.id}>`);
    await channel.send({ content: rendered, allowedMentions: { users: [interaction.user.id] } });
    return interaction.reply({ content: `Mensagem de teste enviada em ${channel}.`, ephemeral: true });
  }
}

async function handleLogsCommand(interaction) {
  requirePermission(interaction, PermissionFlagsBits.ManageGuild);
  const subcommand = interaction.options.getSubcommand();
  if (subcommand === "configurar") {
    const channel = interaction.options.getChannel("canal");
    setSetting(interaction.guildId, "logs_channel", channel.id);
    return interaction.reply({ content: `Canal de registros definido: ${channel}.`, ephemeral: true });
  }
  if (subcommand === "testar") {
    const channelId = getSetting(interaction.guildId, "logs_channel");
    const channel = channelId ? await interaction.guild.channels.fetch(channelId).catch(() => null) : null;
    if (!channel?.isTextBased()) throw new Error("Configure um canal de registros válido primeiro.");
    await channel.send({ content: `✅ Teste de registros solicitado por ${interaction.user}.`, allowedMentions: { users: [interaction.user.id] } });
    return interaction.reply({ content: "Teste enviado ao canal de registros.", ephemeral: true });
  }
  if (subcommand === "ignorar") {
    const action = interaction.options.getString("acao");
    const channel = interaction.options.getChannel("canal");
    const role = interaction.options.getRole("cargo");
    if (Boolean(channel) === Boolean(role)) throw new Error("Informe exatamente um canal ou um cargo.");
    const key = channel ? "ignored_log_channels" : "ignored_log_roles";
    const id = channel?.id || role.id;
    let ids;
    try {
      const current = JSON.parse(getSetting(interaction.guildId, key, "[]"));
      ids = Array.isArray(current) ? current.filter((value) => typeof value === "string") : [];
    } catch {
      ids = [];
    }
    if (action === "adicionar") {
      if (ids.includes(id)) throw new Error("Esse canal ou cargo já está na lista de filtros.");
      ids.push(id);
    } else {
      if (!ids.includes(id)) throw new Error("Esse canal ou cargo não está na lista de filtros.");
      ids = ids.filter((value) => value !== id);
    }
    setSetting(interaction.guildId, key, JSON.stringify(ids));
    const target = channel ? `${channel}` : `o cargo **${role.name}**`;
    return interaction.reply({ content: `${target} foi ${action === "adicionar" ? "adicionado à" : "removido da"} lista de filtros de mensagens editadas e apagadas.`, ephemeral: true });
  }
  if (subcommand === "consultar") {
    const kind = interaction.options.getString("tipo") || "todos";
    const limit = interaction.options.getInteger("limite") || 10;
    const rows = kind === "todos"
      ? all("SELECT * FROM events WHERE guild_id = ? ORDER BY id DESC LIMIT ?", [interaction.guildId, limit])
      : kind === "moderacao"
        ? all("SELECT * FROM events WHERE guild_id = ? AND kind IN ('banir', 'desbanir', 'expulsar', 'castigar', 'descastigar', 'advertir', 'limpar', 'lentidao', 'trancar', 'destrancar', 'apelido') ORDER BY id DESC LIMIT ?", [interaction.guildId, limit])
        : all("SELECT * FROM events WHERE guild_id = ? AND kind LIKE 'ingresso%' ORDER BY id DESC LIMIT ?", [interaction.guildId, limit]);
    const description = rows.map((row) => `**${row.kind}** · <t:${Math.floor(new Date(row.created_at).getTime() / 1000)}:R>\n${row.details.slice(0, 180)}`).join("\n\n") || "Ainda não há eventos registrados.";
    return interaction.reply({ embeds: [new EmbedBuilder().setColor(0x64748b).setTitle("Registros recentes").setDescription(description.slice(0, 4000))], ephemeral: true });
  }
}

async function handlePollButton(interaction, messageId, optionIndex) {
  const poll = get("SELECT * FROM polls WHERE message_id = ? AND guild_id = ?", [messageId, interaction.guildId]);
  if (!poll || interaction.message.id !== messageId) throw new Error("Esta enquete não está mais disponível.");
  const options = JSON.parse(poll.options_json);
  const index = Number(optionIndex);
  if (!Number.isInteger(index) || index < 0 || index >= options.length) throw new Error("Essa opção de enquete é inválida.");
  try {
    run("INSERT INTO poll_votes(message_id, user_id, option_index) VALUES (?, ?, ?)", [messageId, interaction.user.id, index]);
  } catch {
    throw new Error("Você já votou nesta enquete.");
  }
  return interaction.reply({ content: `Seu voto em **${options[index]}** foi registrado.`, ephemeral: true });
}

export async function handleCommand(interaction) {
  if (getGlobalSetting("maintenance", "false") === "true" && !isOwner(interaction.user.id) && !["ajuda", "ping"].includes(interaction.commandName)) {
    throw new Error("O bot está em manutenção. Tente novamente mais tarde.");
  }
  if (["ajuda", "ping", "sobre", "avatar", "usuario", "servidor", "cargo", "membros", "tempoativo", "convite", "suporte"].includes(interaction.commandName)) return handlePublic(interaction);
  if (["banir", "desbanir", "expulsar", "castigar", "descastigar", "advertir", "advertencias", "limpar", "lentidao", "trancar", "destrancar", "apelido", "historico"].includes(interaction.commandName)) return handleModerationCommand(interaction);
  if (interaction.commandName === "ingressos") return handleTicketCommand(interaction);
  if (["avaliar", "avaliacoes"].includes(interaction.commandName)) return handleReviewCommand(interaction);
  if (["meme", "gif", "anime", "abracar", "cafune", "comprimentar", "moeda", "escolher", "piada", "curiosidade", "frase", "bola8"].includes(interaction.commandName)) return handleFunCommand(interaction);
  if (interaction.commandName === "enquete") {
    requireGuild(interaction);
    const question = interaction.options.getString("pergunta");
    const options = ["opcao1", "opcao2", "opcao3", "opcao4", "opcao5"].map((key) => interaction.options.getString(key)).filter(Boolean);
    const components = [];
    for (let start = 0; start < options.length; start += 5) {
      const row = new ActionRowBuilder();
      options.slice(start, start + 5).forEach((option, offset) => row.addComponents(new ButtonBuilder()
        .setCustomId(`enquete:votar:pending:${start + offset}`)
        .setLabel(option.slice(0, 80))
        .setStyle(ButtonStyle.Secondary)));
      components.push(row);
    }
    const message = await interaction.channel.send({
      embeds: [new EmbedBuilder().setColor(0x0ea5e9).setTitle("📊 Enquete").setDescription(`**${question}**\n\n${options.map((option, index) => `${index + 1}. ${option}`).join("\n")}`).setFooter({ text: `Criada por ${interaction.user.tag}` })],
      components,
    });
    for (let index = 0; index < options.length; index += 1) {
      const component = components[Math.floor(index / 5)].components[index % 5];
      component.setCustomId(`enquete:votar:${message.id}:${index}`);
    }
    await message.edit({ components });
    run("INSERT INTO polls(message_id, guild_id, question, options_json, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?)", [message.id, interaction.guildId, question, JSON.stringify(options), interaction.user.id, new Date().toISOString()]);
    return interaction.reply({ content: `Enquete publicada em ${message.url}.`, ephemeral: true });
  }
  if (interaction.commandName === "registros") return handleLogsCommand(interaction);
  if (["boasvindas", "despedidas"].includes(interaction.commandName)) return handleGuildSettings(interaction);
  if (interaction.commandName === "dono") return handleOwner(interaction);
  throw new Error("Esse comando ainda não está disponível.");
}

export async function handleButton(interaction) {
  const [family, action, itemId, value] = interaction.customId.split(":");
  if (family === "ticket" && action === "abrir") {
    if (itemId !== interaction.guildId) throw new Error("Este painel pertence a outro servidor.");
    const result = await openTicket(interaction);
    return interaction.reply({
      content: result.existingChannel ? `Você já tem um atendimento aberto: ${result.existingChannel}` : `Atendimento criado: ${result.channel}`,
      ephemeral: true,
    });
  }
  if (family === "ticket-confirmar") return handleCloseConfirmation(interaction, action, itemId);
  if (family === "ticket") return handleTicketPanelButton(interaction, action, itemId);
  if (family === "ticket-config") return handleTicketConfigButton(interaction, action);
  if (family === "avaliar" && action === "nota") return showReviewCommentModal(interaction, itemId, value);
  if (family === "enquete" && action === "votar") return handlePollButton(interaction, itemId, value);
  throw new Error("Este botão não é reconhecido.");
}

export async function handleModal(interaction) {
  const parts = interaction.customId.split(":");
  if (parts[0] === "ticket-participante") return handleParticipantModal(interaction, parts[1], parts[2]);
  if (parts[0] === "avaliar" && parts[1] === "comentario") {
    await saveReview(interaction, parts[2], parts[3]);
    return interaction.reply({ content: `Obrigado pela avaliação de ${parts[3]} estrela(s)!`, ephemeral: true });
  }
  if (parts[0] === "ticket-config-modal") {
    canConfigureGuild(interaction);
    const field = parts[1];
    if (field === "banner") {
      const attachment = interaction.fields.getUploadedFiles("arquivo", true).first();
      await saveBanner(interaction.guildId, attachment);
      return interaction.reply({ content: "Banner salvo e pronto para a prévia. Use **Visualizar painel** antes de publicar.", ephemeral: true });
    }
    const value = interaction.fields.getTextInputValue("valor").trim();
    if (!value) throw new Error("O campo não pode ficar vazio.");
    setSetting(interaction.guildId, field === "titulo" ? "ticket_title" : "ticket_description", value);
    return interaction.reply({ content: `${field === "titulo" ? "Título" : "Descrição"} salvo. Visualize e publique o painel quando estiver pronto.`, ephemeral: true });
  }
  throw new Error("Este formulário não é reconhecido.");
}

export async function handleInteraction(interaction) {
  try {
    if (interaction.isChatInputCommand()) return await handleCommand(interaction);
    if (interaction.isButton()) return await handleButton(interaction);
    if (interaction.isModalSubmit()) return await handleModal(interaction);
  } catch (error) {
    return replyError(interaction, error);
  }
}
