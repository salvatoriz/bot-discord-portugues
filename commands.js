import {
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from "discord.js";

const text = (name, description, required = true) => (option) =>
  option.setName(name).setDescription(description).setRequired(required);
const user = (name = "membro", description = "Membro do servidor") => (option) =>
  option.setName(name).setDescription(description).setRequired(true);
const reason = (required = false) => (option) =>
  option.setName("motivo").setDescription("Motivo da ação").setRequired(required).setMaxLength(500);
const memberCommand = (name, description, extra = null) => {
  const command = new SlashCommandBuilder().setName(name).setDescription(description);
  if (extra) extra(command);
  else command.addUserOption(user());
  return command;
};
const channelOption = (name, description, required = true) => (option) =>
  option
    .setName(name)
    .setDescription(description)
    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setRequired(required);
const sub = (name, description, configure = null) => (option) => {
  option.setName(name).setDescription(description);
  if (configure) configure(option);
  return option;
};

const definitions = [
  new SlashCommandBuilder().setName("ajuda").setDescription("Mostra os comandos disponíveis."),
  new SlashCommandBuilder().setName("ping").setDescription("Mostra a latência do bot."),
  new SlashCommandBuilder().setName("sobre").setDescription("Apresenta o bot e suas funções."),
  memberCommand("avatar", "Mostra o avatar de um membro.", (c) => c.addUserOption((o) => o.setName("membro").setDescription("Membro do servidor").setRequired(false))),
  memberCommand("usuario", "Mostra informações públicas de um membro.", (c) => c.addUserOption((o) => o.setName("membro").setDescription("Membro do servidor").setRequired(false))),
  new SlashCommandBuilder().setName("servidor").setDescription("Mostra informações do servidor atual."),
  new SlashCommandBuilder().setName("cargo").setDescription("Mostra informações de um cargo.")
    .addRoleOption((o) => o.setName("cargo").setDescription("Cargo para consultar").setRequired(true)),
  new SlashCommandBuilder().setName("membros").setDescription("Mostra a quantidade de membros do servidor."),
  new SlashCommandBuilder().setName("tempoativo").setDescription("Mostra há quanto tempo o bot está ativo."),
  new SlashCommandBuilder().setName("convite").setDescription("Mostra o link de convite do bot."),
  new SlashCommandBuilder().setName("suporte").setDescription("Mostra ou configura os canais e links de suporte.")
    .addChannelOption((o) => o.setName("canal").setDescription("Canal de suporte do servidor").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false))
    .addStringOption((o) => o.setName("link").setDescription("Link HTTPS da central de suporte").setRequired(false).setMaxLength(500)),

  new SlashCommandBuilder().setName("banir").setDescription("Bane um membro do servidor.")
    .addUserOption(user()).addStringOption(reason(false))
    .addIntegerOption((o) => o.setName("apagar_dias").setDescription("Dias de mensagens para apagar (0 a 7)").setMinValue(0).setMaxValue(7).setRequired(false)),
  new SlashCommandBuilder().setName("desbanir").setDescription("Remove o banimento de um usuário.")
    .addStringOption(text("id_usuario", "ID do usuário banido")).addStringOption(reason(false)),
  new SlashCommandBuilder().setName("expulsar").setDescription("Expulsa um membro do servidor.")
    .addUserOption(user()).addStringOption(reason(false)),
  new SlashCommandBuilder().setName("castigar").setDescription("Aplica um tempo de castigo temporário.")
    .addUserOption(user()).addIntegerOption((o) => o.setName("minutos").setDescription("Duração em minutos").setMinValue(1).setMaxValue(40320).setRequired(true)).addStringOption(reason(false)),
  new SlashCommandBuilder().setName("descastigar").setDescription("Remove o castigo temporário de um membro.")
    .addUserOption(user()).addStringOption(reason(false)),
  new SlashCommandBuilder().setName("advertir").setDescription("Registra uma advertência para um membro.")
    .addUserOption(user()).addStringOption(reason(true)),
  new SlashCommandBuilder().setName("advertencias").setDescription("Consulta advertências de um membro.")
    .addUserOption(user()),
  new SlashCommandBuilder().setName("limpar").setDescription("Exclui mensagens recentes do canal.")
    .addIntegerOption((o) => o.setName("quantidade").setDescription("Quantidade entre 1 e 100").setMinValue(1).setMaxValue(100).setRequired(true)),
  new SlashCommandBuilder().setName("lentidao").setDescription("Configura o modo lento do canal.")
    .addIntegerOption((o) => o.setName("segundos").setDescription("Intervalo em segundos (0 desativa)").setMinValue(0).setMaxValue(21600).setRequired(true)),
  new SlashCommandBuilder().setName("trancar").setDescription("Impede novas mensagens no canal atual."),
  new SlashCommandBuilder().setName("destrancar").setDescription("Restaura a permissão de envio no canal atual."),
  new SlashCommandBuilder().setName("apelido").setDescription("Altera o apelido de um membro.")
    .addUserOption(user()).addStringOption((o) => o.setName("apelido").setDescription("Novo apelido; deixe vazio para remover").setRequired(false).setMaxLength(32)).addStringOption(reason(false)),
  new SlashCommandBuilder().setName("historico").setDescription("Consulta registros de moderação autorizados.")
    .addUserOption((o) => o.setName("membro").setDescription("Filtrar por membro").setRequired(false))
    .addIntegerOption((o) => o.setName("limite").setDescription("Quantidade de registros (1 a 20)").setMinValue(1).setMaxValue(20).setRequired(false)),

  new SlashCommandBuilder().setName("ingressos").setDescription("Gerencia os atendimentos por ingressos.")
    .addSubcommand(sub("configurar", "Abre as configurações interativas do painel.", (o) => o
      .addChannelOption((x) => x.setName("canal").setDescription("Canal onde o painel será publicado").addChannelTypes(ChannelType.GuildText).setRequired(false))
      .addChannelOption((x) => x.setName("categoria").setDescription("Categoria dos canais privados").addChannelTypes(ChannelType.GuildCategory).setRequired(false))
      .addRoleOption((x) => x.setName("cargo_equipe").setDescription("Cargo que terá acesso aos atendimentos").setRequired(false))
      .addChannelOption(channelOption("canal_registros", "Canal para registros dos atendimentos", false))
      .addStringOption((x) => x.setName("titulo").setDescription("Título inicial do painel").setRequired(false).setMaxLength(100))
      .addStringOption((x) => x.setName("descricao").setDescription("Texto de apresentação").setRequired(false).setMaxLength(1000))
      .addAttachmentOption((x) => x.setName("banner").setDescription("Imagem ou GIF PNG, JPG, WEBP ou GIF").setRequired(false))
      .addBooleanOption((x) => x.setName("permitir_duplicados").setDescription("Permite mais de um atendimento por membro").setRequired(false))))
    .addSubcommand(sub("painel", "Publica ou atualiza o painel de atendimentos.", (o) => o
      .addChannelOption(channelOption("canal", "Canal para publicar o painel", false))))
    .addSubcommand(sub("adicionar", "Adiciona um membro ao atendimento atual.", (o) => o.addUserOption(user())))
    .addSubcommand(sub("remover", "Remove um membro do atendimento atual.", (o) => o.addUserOption(user())))
    .addSubcommand(sub("fechar", "Solicita confirmação para fechar o atendimento atual."))
    .addSubcommand(sub("reabrir", "Reabre o atendimento atual."))
    .addSubcommand(sub("assumir", "Atribui o atendimento atual a você."))
    .addSubcommand(sub("transcricao", "Gera uma transcrição do atendimento atual."))
    .addSubcommand(sub("estatisticas", "Mostra estatísticas de atendimentos.")),

  new SlashCommandBuilder().setName("avaliar").setDescription("Avalia um atendimento permitido."),
  new SlashCommandBuilder().setName("avaliacoes").setDescription("Gerencia as avaliações do servidor.")
    .addSubcommand(sub("configurar", "Configura o canal de avaliações.", (o) => o.addChannelOption(channelOption("canal", "Canal de avaliações", true))))
    .addSubcommand(sub("painel", "Publica o painel de avaliações.", (o) => o.addChannelOption(channelOption("canal", "Canal do painel", false))))
    .addSubcommand(sub("estatisticas", "Mostra a média e a quantidade de avaliações."))
    .addSubcommand(sub("usuario", "Consulta avaliações permitidas de um membro.", (o) => o.addUserOption(user())))
    .addSubcommand(sub("exportar", "Exporta avaliações para CSV.")),

  new SlashCommandBuilder().setName("meme").setDescription("Busca um meme apropriado em uma fonte pública."),
  new SlashCommandBuilder().setName("gif").setDescription("Busca um GIF seguro de acordo com o tema.")
    .addStringOption((o) => o.setName("tema").setDescription("Tema do GIF").setRequired(false).setMaxLength(50)),
  new SlashCommandBuilder().setName("anime").setDescription("Mostra um anime aleatório por uma fonte pública."),
  new SlashCommandBuilder().setName("abracar").setDescription("Envia uma interação amigável de abraço.")
    .addUserOption(user()),
  new SlashCommandBuilder().setName("cafune").setDescription("Envia uma interação amigável de cafuné.")
    .addUserOption(user()),
  new SlashCommandBuilder().setName("comprimentar").setDescription("Cumprimenta um membro.")
    .addUserOption(user()),
  new SlashCommandBuilder().setName("moeda").setDescription("Sorteia cara ou coroa."),
  new SlashCommandBuilder().setName("escolher").setDescription("Escolhe uma das opções informadas.")
    .addStringOption((o) => o.setName("opcoes").setDescription("Separe de 2 a 10 opções com ponto e vírgula").setRequired(true).setMaxLength(500)),
  new SlashCommandBuilder().setName("enquete").setDescription("Cria uma enquete com até cinco opções.")
    .addStringOption(text("pergunta", "Pergunta da enquete"))
    .addStringOption(text("opcao1", "Primeira opção"))
    .addStringOption((o) => o.setName("opcao2").setDescription("Segunda opção").setRequired(true))
    .addStringOption((o) => o.setName("opcao3").setDescription("Terceira opção").setRequired(false))
    .addStringOption((o) => o.setName("opcao4").setDescription("Quarta opção").setRequired(false))
    .addStringOption((o) => o.setName("opcao5").setDescription("Quinta opção").setRequired(false)),
  new SlashCommandBuilder().setName("piada").setDescription("Conta uma piada apropriada."),
  new SlashCommandBuilder().setName("curiosidade").setDescription("Apresenta uma curiosidade."),
  new SlashCommandBuilder().setName("frase").setDescription("Apresenta uma frase."),
  new SlashCommandBuilder().setName("bola8").setDescription("Responde a uma pergunta com a bola oito.")
    .addStringOption(text("pergunta", "Pergunta que possa ser respondida com sim ou não")),

  new SlashCommandBuilder().setName("registros").setDescription("Configura e consulta os registros do servidor.")
    .addSubcommand(sub("configurar", "Define o canal de registros.", (o) => o.addChannelOption(channelOption("canal", "Canal de registros", true))))
    .addSubcommand(sub("testar", "Verifica se o canal de registros está acessível."))
    .addSubcommand(sub("consultar", "Consulta eventos recentes do servidor.", (o) => o
      .addStringOption((x) => x.setName("tipo").setDescription("Tipo de evento").setRequired(false)
        .addChoices({ name: "Todos", value: "todos" }, { name: "Moderação", value: "moderacao" }, { name: "Atendimentos", value: "ingresso" }))
      .addIntegerOption((x) => x.setName("limite").setDescription("Quantidade de eventos (1 a 20)").setMinValue(1).setMaxValue(20).setRequired(false))))
    .addSubcommand(sub("ignorar", "Gerencia filtros de canal e cargo para registros de mensagens.", (o) => o
      .addStringOption((x) => x.setName("acao").setDescription("Adicionar ou remover um filtro").setRequired(true)
        .addChoices({ name: "Adicionar", value: "adicionar" }, { name: "Remover", value: "remover" }))
      .addChannelOption((x) => x.setName("canal").setDescription("Canal para filtrar mensagens editadas/apagadas").addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement).setRequired(false))
      .addRoleOption((x) => x.setName("cargo").setDescription("Cargo cujas mensagens serão filtradas").setRequired(false)))),
  new SlashCommandBuilder().setName("boasvindas").setDescription("Configura as mensagens de boas-vindas.")
    .addSubcommand(sub("configurar", "Configura o canal de boas-vindas.", (o) => o
      .addChannelOption(channelOption("canal", "Canal de boas-vindas", true))
      .addStringOption((x) => x.setName("mensagem").setDescription("Use {membro}, {servidor} e {mencao}").setRequired(false).setMaxLength(1000))))
    .addSubcommand(sub("testar", "Envia uma prévia da mensagem de boas-vindas."))
    .addSubcommand(sub("mensagem", "Atualiza o texto de boas-vindas.", (o) => o.addStringOption(text("texto", "Use {membro}, {servidor} e {mencao}")))),
  new SlashCommandBuilder().setName("despedidas").setDescription("Configura as mensagens de despedida.")
    .addSubcommand(sub("configurar", "Configura o canal de despedidas.", (o) => o
      .addChannelOption(channelOption("canal", "Canal de despedidas", true))
      .addStringOption((x) => x.setName("mensagem").setDescription("Use {membro}, {servidor} e {mencao}").setRequired(false).setMaxLength(1000))))
    .addSubcommand(sub("testar", "Envia uma prévia da mensagem de despedida."))
    .addSubcommand(sub("mensagem", "Atualiza o texto de despedida.", (o) => o.addStringOption(text("texto", "Use {membro}, {servidor} e {mencao}")))),

  new SlashCommandBuilder().setName("dono").setDescription("Comandos exclusivos do proprietário do bot.")
    .addSubcommand(sub("ajuda", "Lista os comandos exclusivos do proprietário."))
    .addSubcommand(sub("status", "Mostra o estado do bot."))
    .addSubcommand(sub("estatisticas", "Mostra estatísticas gerais."))
    .addSubcommand(sub("servidores", "Lista os servidores em que o bot está."))
    .addSubcommand(sub("informacoes", "Mostra informações técnicas."))
    .addSubcommand(sub("manutencao", "Ativa ou desativa o modo de manutenção.", (o) => o.addBooleanOption((x) => x.setName("ativar").setDescription("Ativar o modo de manutenção").setRequired(true))))
    .addSubcommand(sub("configuracao", "Consulta as configurações globais."))
    .addSubcommand(sub("diagnostico", "Verifica problemas conhecidos."))
    .addSubcommand(sub("recarregar", "Atualiza os comandos de barra do bot.")),
].map((command) => command.setDMPermission(false));

for (const command of definitions) {
  if (command.name === "ajuda" || command.name === "ping" || command.name === "sobre" || command.name === "avatar" || command.name === "convite" || command.name === "tempoativo") {
    command.setDMPermission(true);
  }
}

// Export only JSON-safe Discord application command payloads.
export const commandPayloads = definitions.map((command) => command.toJSON());
export const commandNames = commandPayloads.map((command) => command.name);
export { PermissionFlagsBits };
