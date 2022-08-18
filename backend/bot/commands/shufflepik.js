const { SlashCommandBuilder } = require("@discordjs/builders"); //from "@discordjs/builders";

module.exports = {
  data: new SlashCommandBuilder()
    .setName("shufflepik")
    .setDescription("Display a random picture from server pool"),
};
/*
export const data = new SlashCommandBuilder()
  .setName("shufflepik")
  .setDescription("Display a random picture from server pool");
*/
