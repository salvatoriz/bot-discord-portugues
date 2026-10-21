# Bot de Discord em Português

Bot modular para servidores Discord, com comandos de utilidade, moderação, atendimentos privados, avaliações, enquetes, registros e mensagens de entrada e saída. O código usa discord.js 14, Node.js LTS e SQLite por meio de WebAssembly — sem módulos nativos que precisem ser compilados no Termux ou no Windows.

## Requisitos

- Node.js LTS 22.12 ou mais recente (Node.js 22 LTS ou 24 LTS).
- Uma aplicação e um bot criados no Discord Developer Portal.
- Permissões administrativas no servidor somente para quem for configurar os recursos.

## Instalação no Termux

1. Instale o Termux atualizado. No Termux, execute:

   ```sh
   pkg update
   pkg install nodejs-lts git unzip
   ```

2. Extraia o ZIP e entre na pasta `bot-discord-portugues`.
3. Confira o Node.js com `node --version` (versão 22.12 ou superior).
4. Instale as dependências:

   ```sh
   npm install
   ```

5. Copie `.env.example` para `.env`, abra o `.env` em um editor de texto e preencha `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` e `BOT_OWNER_ID` (se quiser habilitar os comandos `/dono`).
6. Registre os comandos e inicie o bot:

   ```sh
   npm run deploy:commands
   npm start
   ```

Para manter o processo ativo quando o Termux estiver em segundo plano, permita que o Android deixe o Termux funcionar sem restrições de bateria. O Android pode encerrar processos em segundo plano.

## Instalação no Windows

1. Instale o Node.js LTS 22.12 ou 24 pelo instalador oficial; o instalador inclui o npm.
2. Extraia o ZIP e abra o CMD ou PowerShell dentro da pasta `bot-discord-portugues`.
3. Instale as dependências:

   ```bat
   npm install
   ```

4. Copie `.env.example` para `.env` e preencha `DISCORD_TOKEN`, `DISCORD_CLIENT_ID` e `BOT_OWNER_ID` (se quiser habilitar os comandos `/dono`).
5. Registre os comandos e inicie:

   ```bat
   npm run deploy:commands
   npm start
   ```

O banco SQLite e os banners ficam na pasta local `data/`, criada automaticamente. Faça cópias de segurança dessa pasta para preservar os dados.

## Configurar o Discord Developer Portal

1. Crie uma aplicação e adicione um bot.
2. Copie o token do bot para `DISCORD_TOKEN` no arquivo `.env`. Não o envie em mensagens nem o publique.
3. Copie o ID da aplicação para `DISCORD_CLIENT_ID`.
4. Em **Bot → Privileged Gateway Intents**, ative **Server Members Intent** e **Message Content Intent**. São necessários para boas-vindas/despedidas, alterações de membros e observação de mensagens editadas/apagadas.
5. Convide o bot com os escopos `bot` e `applications.commands`. O comando `/convite` gera um link com as permissões usadas pela aplicação.
6. Posicione o cargo do bot acima dos cargos que ele deverá moderar. Conceda somente as permissões necessárias no servidor.
7. No servidor, configure o canal de registros com `/registros configurar`; configure e publique o painel com `/ingressos configurar` e `/ingressos painel`.

O bot não pede o token durante a configuração do servidor. O token fica apenas no `.env` da máquina onde o bot é iniciado.

## Comandos

Todos os nomes, descrições, botões e respostas visíveis estão em português brasileiro.

- **Utilidade:** `/ajuda`, `/ping`, `/sobre`, `/avatar`, `/usuario`, `/servidor`, `/cargo`, `/membros`, `/tempoativo`, `/convite`, `/suporte`.
- **Moderação:** `/banir`, `/desbanir`, `/expulsar`, `/castigar`, `/descastigar`, `/advertir`, `/advertencias`, `/limpar`, `/lentidao`, `/trancar`, `/destrancar`, `/apelido`, `/historico`.
- **Ingressos:** `/ingressos configurar`, `/ingressos painel`, `/ingressos adicionar`, `/ingressos remover`, `/ingressos fechar`, `/ingressos reabrir`, `/ingressos assumir`, `/ingressos transcricao`, `/ingressos estatisticas`.
- **Avaliações:** `/avaliar`, `/avaliacoes configurar`, `/avaliacoes painel`, `/avaliacoes estatisticas`, `/avaliacoes usuario`, `/avaliacoes exportar`.
- **Diversão:** `/meme`, `/gif`, `/anime`, `/abracar`, `/cafune`, `/comprimentar`, `/moeda`, `/escolher`, `/enquete`, `/piada`, `/curiosidade`, `/frase`, `/bola8`.
- **Registros:** `/registros configurar`, `/registros testar`, `/registros consultar`, `/registros ignorar`.
- **Mensagens automáticas:** `/boasvindas configurar`, `/boasvindas testar`, `/boasvindas mensagem`, `/despedidas configurar`, `/despedidas testar`, `/despedidas mensagem`.
- **Proprietário:** `/dono ajuda`, `/dono status`, `/dono estatisticas`, `/dono servidores`, `/dono informacoes`, `/dono manutencao`, `/dono configuracao`, `/dono diagnostico`, `/dono recarregar`.

Os comandos `/dono` verificam o ID definido em `BOT_OWNER_ID` no arquivo `.env`. Cada pessoa que hospedar sua própria instância deve configurar o próprio ID; se ficar vazio, os comandos `/dono` ficam indisponíveis.

Use `/suporte canal:<canal>` e/ou `/suporte link:<link HTTPS>` para definir informações de suporte por servidor. `/registros ignorar` adiciona ou remove um canal ou cargo da filtragem de registros de mensagens editadas/apagadas.

## Personalizar o painel de ingressos

Use `/ingressos configurar` para definir o canal do painel, a categoria de canais privados, o cargo da equipe, o canal de registros, o título, a descrição e a regra de atendimentos duplicados. Se preferir, anexe o banner nessa configuração. A resposta privada também apresenta botões para editar o título ou a descrição, enviar/trocar um banner usando o seletor de arquivo do Discord, remover o banner, visualizar, salvar e publicar o painel.

Configure um cargo de equipe antes de publicar e abrir atendimentos.

São aceitos PNG, JPG/JPEG, WEBP e GIF de até 8 MB. Os bytes do arquivo ficam em `data/banners/`, separados por servidor. GIFs são enviados como arquivo, preservando a animação suportada pelo Discord. O painel usa Components V2 da versão atual do discord.js.

## Testes

Na pasta extraída, execute:

```sh
npm test
```

Os testes verificam a criação dos comandos de barra e a persistência de configurações, avisos e registros no SQLite. Eles não conectam a um bot real; valide comandos em um servidor de teste antes de usá-los em produção.

## Solução de problemas

- **Token inválido ou bot desconectado:** confira `DISCORD_TOKEN`; se ele foi exposto, gere outro no Developer Portal e substitua o valor local.
- **Comandos não aparecem:** confirme `DISCORD_CLIENT_ID`, os escopos do convite e execute `npm run deploy:commands` novamente. Comandos globais podem levar alguns minutos para aparecer.
- **Falta de permissão:** confirme as permissões do bot e a posição dos cargos. O bot não consegue moderar cargos iguais ou superiores ao cargo mais alto dele.
- **Atendimentos não podem ser criados:** confira permissão para ver canais, enviar mensagens e gerenciar canais; confirme também a categoria e o cargo de equipe.
- **Sem registros de conteúdo ou eventos de membros:** ative os intents privilegiados indicados acima e confira o canal definido com `/registros configurar`.
- **Falha ao baixar banner:** reenvie uma imagem dentro do limite, confirme que a extensão e o conteúdo correspondem e tente novamente. O arquivo fica salvo localmente em `data/banners/`.
- **Dados ausentes após reinstalação:** restaure a pasta `data/` do backup. O banco é persistido localmente no dispositivo em que o bot roda.
- **Termux encerra o bot:** remova a otimização de bateria do Termux e mantenha o aplicativo aberto quando possível.

## Dados e segurança

As configurações, advertências, atendimentos, avaliações, enquetes e registros ficam em um banco SQLite local e isolados pelo ID do servidor. Use `/registros ignorar` para não registrar mensagens editadas/apagadas de um canal ou de membros com determinado cargo. Os registros de exclusão não afirmam quem apagou a mensagem quando o Discord não fornece essa identificação. O arquivo `.env` e a pasta `data/` estão ignorados pelo Git.
