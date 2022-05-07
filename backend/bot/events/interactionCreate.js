const shufflepikController = require("../controllers/commands.contoller");
const { MessageEmbed, MessageAttachment } = require("discord.js");
const path = require("path");
const dayjs = require("dayjs");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    if (!interaction.isCommand()) return;
    switch (interaction.commandName) {
      case "shufflepik":
        const userAvatar = `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.png`;
        const randomImageData = await shufflepikController.shufflepik(
          interaction.guildId,
          interaction.member.user.id
        );
        //If there are no images in guild send back message letting user know
        if (!randomImageData) {
          const embed = new MessageEmbed()
            .setColor("#4e54c8")
            .addField(
              "🤷 Where are da pics?",
              "It appears this server has no images in its image pool. Feel feel to upload pictures to this server's image pool through Shufflepik. Create an account here [Shufflepik](https://shufflepik.com)"
            );
          await interaction.reply({ embeds: [embed] });
          return;
        }
        //Return the filename and extension of image
        //looks like -> uploads/xxxxxxxxxxxx/filename.ext ~ We want -> filename.ext
        const fileNameAndExt = randomImageData.imageUrl.split("/")[3];
        const file = new MessageAttachment(
          path.resolve(
            __dirname,
            `${process.env.UPLOADS_RELATIVE_PATH_PREFIX}${randomImageData.imageUrl}`
          )
        );

        //Wrap dateUploaded string with date.toLocaleString object to get localized, in this case PST (PT) date object.
        let pst = new Date(randomImageData.dateUploaded).toLocaleString(
          "en-US",
          {
            timeZone: "America/Los_Angeles",
          }
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
            `${dayjs(pst).format("MMM D, YY h:mma")} - (PT) Pacific Time`,
            false
          )
          .setImage(`attachment://${fileNameAndExt}`)
          .setTimestamp()
          .setFooter({
            text: "Add pics to this server pool at shufflepik.com",
            iconURL: "https://i.imgur.com/2cywyH9.png",
          });
        //await interaction.reply("pong!");
        await interaction.reply({ embeds: [embed], files: [file] });
      default:
        break;
    }
  },
};
