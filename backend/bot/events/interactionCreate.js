const shufflepikController = require("../controllers/commands.contoller");
const { MessageEmbed, MessageAttachment } = require("discord.js");
const path = require("path");
const dayjs = require("dayjs");
const fs = require("fs-extra");

module.exports = {
  name: "interactionCreate",
  async execute(interaction) {
    try {
      if (!interaction.isCommand()) return;

      switch (interaction.commandName) {
        case "shufflepik":
          //defer reply in the event user DNE in guild and system has to delete everything related to said user.
          await interaction.deferReply();
          const randomImageData = await shufflepikController.shufflepik(
            interaction.member.guild.id,
            interaction.member.user.id
          );
          //If there are no images in guild send back message letting user know
          if (!randomImageData) {
            const embed = new MessageEmbed()
              .setColor("#4e54c8")
              .addField(
                "🤷 Where are da pics?",
                "It appears this server has no images in its image pool. If you're not on Shufflepik create an account 👉 [Shufflepik](https://shufflepik.com) then upload images to this server's image pool!"
              );
            //await interaction.reply({ embeds: [embed] });
            await interaction.editReply({ embeds: [embed] });
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
          const placeholderIcon = "https://i.imgur.com/2cywyH9.png";
          const messageAuthorIcon = randomImageData.avatar
            ? `https://cdn.discordapp.com/avatars/${interaction.user.id}/${randomImageData.avatar}.png`
            : placeholderIcon;
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
              iconURL: messageAuthorIcon,
              url: `https://shufflepik.com`,
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

          await interaction.editReply({ embeds: [embed], files: [file] });

        default:
          break;
      }
      return;
    } catch (err) {
      console.log("Error here tho?");
      console.log(err);
      console.log(interaction);
      throw err;
    }
  },
};
