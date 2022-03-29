const shufflepikMediaController = require("../../controllers/media.controller");
const { MessageEmbed, MessageAttachment, Channel } = require("discord.js");
const path = require("path");
const dayjs = require("dayjs");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isCommand()) return;
    switch (interaction.commandName) {
      case "shufflepik":
        console.log("Interaction belongs to this guild id");
        console.log(interaction.guildId);
        console.log(interaction.user);
        const userAvatar = `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`;
        const randomImageData = await shufflepikMediaController.shufflepik(
          interaction.guildId
        );
        console.log("In interaction create, image is:");
        console.log(randomImageData);
        console.log("Image path is:");
        //Return the filename and extension of image
        //looks like -> uploads/xxxxxxxxxxxx/filename.ext ~ We want -> filename.ext
        const fileNameAndExt = randomImageData.imageUrl.split("/")[3];
        const file = new MessageAttachment(
          path.resolve(__dirname, `../../${randomImageData.imageUrl}`)
        );

        const embed = new MessageEmbed()
          .setColor("#4e54c8")
          .setTitle(randomImageData.imageTitle)
          .setAuthor({
            name: `Posted by : ${randomImageData.uploadedByUsername}`,
            iconURL: userAvatar,
          })
          .addField(
            "Date uploaded",
            `${dayjs(randomImageData.dateUploaded).format("MMM D YY h:mma")}`,
            false
          )
          .setImage(`attachment://${fileNameAndExt}`)
          .setTimestamp()
          .setFooter({
            text: "Upload pics to show up here at shufflepik.com",
            iconURL: "https://i.imgur.com/2cywyH9.png",
          });
        //await interaction.reply("pong!");
        await interaction.reply({ embeds: [embed], files: [file] });
      default:
        break;
    }
  },
};
