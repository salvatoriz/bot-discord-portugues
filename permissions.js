import { PermissionFlagsBits } from "discord.js";

export const OWNER_ID = process.env.BOT_OWNER_ID ?? "";

export function isOwner(userId) {
  return Boolean(OWNER_ID) && userId === OWNER_ID;
}

export function requireGuild(interaction) {
  if (!interaction.inGuild() || !interaction.guild) {
    throw new Error("Este comando só pode ser usado dentro de um servidor.");
  }
}

export function requirePermission(interaction, permission) {
  requireGuild(interaction);
  if (!interaction.memberPermissions?.has(permission)) {
    throw new Error("Você não tem permissão para usar este comando.");
  }
}

export async function authorizeModeration(interaction, permission, target = null) {
  requirePermission(interaction, permission);
  const botMember = interaction.guild.members.me ?? await interaction.guild.members.fetchMe();
  if (!botMember.permissions.has(permission)) {
    throw new Error("O bot não tem a permissão necessária para executar esta ação.");
  }
  if (!target) return;

  if (target.id === interaction.user.id) {
    throw new Error("Você não pode aplicar essa ação a si mesmo.");
  }
  if (target.id === interaction.guild.ownerId) {
    throw new Error("Essa ação não pode ser aplicada ao proprietário do servidor.");
  }
  if (target.id === botMember.id) {
    throw new Error("O bot não pode aplicar essa ação a si mesmo.");
  }
  if (target.roles.highest.comparePositionTo(botMember.roles.highest) >= 0) {
    throw new Error("O cargo mais alto do bot precisa estar acima do cargo do membro.");
  }
  if (
    interaction.user.id !== interaction.guild.ownerId &&
    interaction.member.roles.highest.comparePositionTo(target.roles.highest) <= 0
  ) {
    throw new Error("Seu cargo mais alto precisa estar acima do cargo do membro.");
  }
}

export function requireTicketStaff(interaction, configuredRoleId) {
  requireGuild(interaction);
  if (
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild) ||
    interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels) ||
    (configuredRoleId && interaction.member.roles.cache.has(configuredRoleId))
  ) return;
  throw new Error("Somente a equipe configurada ou administradores podem usar esta ação.");
}

export function canConfigureGuild(interaction) {
  requirePermission(interaction, PermissionFlagsBits.ManageGuild);
}
