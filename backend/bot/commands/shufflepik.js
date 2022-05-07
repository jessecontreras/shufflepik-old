const { SlashCommandBuilder } = require("@discordjs/builders");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shufflepik")
    .setDescription("Display a random picture from server pool"),
  async execute(interaction) {
    await interaction.reply("Pong!");
  },
};
