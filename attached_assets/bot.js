require("dotenv").config();
const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const fetch = require("node-fetch"); // Import fetch for API calls

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// Database setup
const db = new sqlite3.Database("./monster_tracker.db", (err) => {
  if (err) console.error(err.message);
  console.log("Connected to the database.");
});
db.run(
  "CREATE TABLE IF NOT EXISTS encounters (user_id TEXT, monster_name TEXT, size TEXT, PRIMARY KEY (user_id, monster_name, size))"
);

// API URL (Replace with your actual API endpoint)
const MONSTER_API_URL = "https://mhw-db.com/monsters";

// Function to fetch monster names
async function fetchMonsters() {
  try {
    const response = await fetch(MONSTER_API_URL);
    const data = await response.json();
    return data.monsters || []; // Ensure it returns an array
  } catch (error) {
    console.error("Error fetching monster list:", error);
    return [];
  }
}

// Slash command registration
const commands = [
  { name: "log", description: "Log a monster encounter" },
  { name: "progress", description: "Check your logged encounters" },
];

const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

async function registerCommands() {
  try {
    console.log("Registering slash commands...");
    await rest.put(Routes.applicationCommands("YOUR_BOT_CLIENT_ID"), {
      body: commands,
    });
    console.log("Slash commands registered!");
  } catch (error) {
    console.error(error);
  }
}

// When the bot is ready
client.once("ready", () => {
  console.log(`Logged in as ${client.user.tag}`);
  registerCommands();
});

// Handle slash commands
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "log") {
    const monsters = await fetchMonsters();
    if (monsters.length === 0)
      return interaction.reply("Could not fetch monster list.");

    const monsterMenu = new StringSelectMenuBuilder()
      .setCustomId("select_monster")
      .setPlaceholder("Choose a monster")
      .addOptions(
        monsters.map((monster) => ({
          label: monster.name,
          value: monster.toLowerCase(),
        }))
      );

    const sizeMenu = new StringSelectMenuBuilder()
      .setCustomId("select_size")
      .setPlaceholder("Choose a size")
      .addOptions([
        { label: "Smallest", value: "smallest" },
        { label: "Largest", value: "largest" },
      ]);

    const row1 = new ActionRowBuilder().addComponents(monsterMenu);
    const row2 = new ActionRowBuilder().addComponents(sizeMenu);

    await interaction.reply({
      content: "Select a monster and size:",
      components: [row1, row2],
      ephemeral: true,
    });
  }

  if (interaction.commandName === "progress") {
    const userId = interaction.user.id;
    db.all(
      "SELECT monster_name, size FROM encounters WHERE user_id = ?",
      [userId],
      (err, rows) => {
        if (err) return interaction.reply("Error fetching progress.");
        if (!rows.length)
          return interaction.reply("You haven't logged any encounters yet.");

        let progress = rows
          .map((row) => `🦖 **${row.monster_name}** (${row.size})`)
          .join("\n");
        interaction.reply(`**Your Progress:**\n${progress}`);
      }
    );
  }
});

// Handle dropdown selections
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isStringSelectMenu()) return;

  const userId = interaction.user.id;

  if (interaction.customId === "select_monster") {
    interaction.message.monsterSelection = interaction.values[0]; // Store selected monster
    await interaction.reply({
      content: `Selected monster: **${interaction.values[0]}**. Now choose a size!`,
      ephemeral: true,
    });
  }

  if (interaction.customId === "select_size") {
    if (!interaction.message.monsterSelection) {
      return interaction.reply({
        content: "Please select a monster first!",
        ephemeral: true,
      });
    }

    const monster = interaction.message.monsterSelection;
    const size = interaction.values[0];

    db.run(
      "INSERT OR IGNORE INTO encounters (user_id, monster_name, size) VALUES (?, ?, ?)",
      [userId, monster, size],
      (err) => {
        if (err) return interaction.reply("Error logging encounter.");
        interaction.reply(
          `Logged **${size}** **${monster}** for <@${userId}>!`
        );
      }
    );
  }
});

client.login(process.env.DISCORD_TOKEN);
