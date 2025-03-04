export const meta = {
  name: "inventory",
  description: "Manage your inventory.",
  author: "Liane Cagara",
  version: "1.1.3",
  usage: "{prefix}inventory <action> [args]",
  category: "User Management",
  permissions: [0],
  noPrefix: false,
  waitingTime: 1,
  otherNames: ["inv", "items"],
};

export const style = {
  title: "🎒 Inventory",
  titleFont: "bold",
  contentFont: "fancy",
};
const { parseCurrency: pCy } = global.utils;

export async function entry({
  input,
  output,
  money,
  args,
  Inventory,
  prefix,
  generateTreasure,
  GearsManage,
  commandName,
  PetPlayer,
  Collectibles,
}) {
  let userData = await money.get(input.senderID);
  const { inventory, petsData, gearsData, collectibles } = getDatas(userData);
  const userDataCopy = userData;
  function getDatas({ ...data }) {
    const inventory = new Inventory(data.inventory);
    data.petsData ??= [];
    const petsData = new Inventory(data.petsData);
    const gearsData = new GearsManage(data.gearsData);
    const collectibles = new Collectibles(data.collectibles ?? []);
    return { inventory, petsData, gearsData, collectibles };
  }
  const a = "━━━━━━━━━━━━━━━";

  function getPetList(
    newData = petsData,
    newGear = gearsData,
    targetItem = {},
    index = 0,
  ) {
    return newData
      .getAll()
      .map((pet) => {
        const gearData = newGear.getGearData(pet.key);
        const player = new PetPlayer(pet, gearData.toJSON());
        const gearDataAfter = gearData.clone();
        if (targetItem.type === "armor") {
          gearDataAfter.equipArmor(index, targetItem);
        } else if (targetItem.type === "weapon") {
          gearDataAfter.equipWeapon(targetItem);
        }
        const playerAfter = new PetPlayer(pet, gearDataAfter.toJSON());
        const atkDiff = playerAfter.ATK - player.ATK;
        const defDiff = playerAfter.DF - player.DF;
        const magicDiff = playerAfter.MAGIC - player.MAGIC;
        return `${player.getPlayerUI()}\nATK **${player.ATK} -> ${player.ATK + atkDiff}** (${atkDiff < 0 ? atkDiff : `+${atkDiff}`})\nDEF **${player.DF} -> ${player.DF + defDiff}** (${defDiff < 0 ? defDiff : `+${defDiff}`})\nMAGIC **${player.MAGIC} -> ${player.MAGIC + magicDiff}** (${magicDiff < 0 ? magicDiff : `+${magicDiff}`}) \n${a}\n⚔️ ${gearData.getWeaponUI()}\n🔰 ${gearData.getArmorUI(0)}\n🔰 ${gearData.getArmorUI(1)}`;
      })
      .join("\n" + a + "\n\n");
  }

  const [action = "", ...actionArgs] = args;

  switch (action.toLowerCase()) {
    case "list": {
      let userData = userDataCopy;
      let { inventory, petsData, gearsData, collectibles } = getDatas(userData);
      let otherTarget = null;
      if (actionArgs[0]) {
        const allUsers = await money.getAll();
        const target = allUsers[actionArgs[0]];
        if (!target) {
          return output.reply(`User not found.`);
        }
        ({ inventory, petsData, gearsData, collectibles } = getDatas(target));
        otherTarget = target;
        userData = target;
      }
      const items = inventory.getAll();
      collectibles.register("money", {
        key: "money",
        name: "Money",
        flavorText: "This is what you have, anytime, anywhere.",
        icon: "💵",
        type: "currencyInv",
      });
      collectibles.register("puzzlePiece", {
        key: "puzzlePiece",
        name: "Puzzle Piece",
        flavorText: "Basically, Idk.",
        icon: "🧩",
        type: "currencyInv",
      });
      /*collectibles.register("gems", {
        key: "gems",
        name: "Gems",
        flavorText: "Gems, what do you even expect?",
        icon: "💎",
        type: "currency",
      });*/
      collectibles.set("money", userData.money);
      collectibles.set("puzzlePiece", userData.wordGameWins ?? 0);
      collectibles.removeEmpty();

      /*if (items.length === 0) {
        return output.reply("Your inventory is empty.");
      }*/
      /*let itemList = items
        .map((item) => `${item.icon} ${item.name} (${item.key})`)
        .join("\n");
      itemList += `\n`;
      for (let i = 0; i < 8 - items.length; i++) {
        itemList += `${"_".repeat(15)}\n`;
      }*/
      const categoryMap = new Map();
      for (const item of items) {
        const category = item.type;
        if (!categoryMap.has(category)) {
          categoryMap.set(category, []);
        }
        const map = categoryMap.get(category);
        map.push(item);
      }

      let itemList = ``;
      const sorted = Array.from(categoryMap).sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      for (const [category, items] of sorted) {
        itemList += `☆ [font=double_struck]${String(category).toUpperCase().replaceAll("_", " ")}[:font=double_struck]\n\n`;
        itemList += items
          .map((item) => `${item.icon} ${item.name} (${item.key})`)
          .join("\n");
        itemList += `\n\n`;
      }
      const cllMap = new Map();
      for (const item of collectibles) {
        const category = item.metadata.type ?? "Uncategorized";
        if (!cllMap.has(category)) {
          cllMap.set(category, []);
        }
        const map = cllMap.get(category);
        map.push(item);
      }
      let cllList = ``;
      const sorted2 = Array.from(cllMap).sort((a, b) =>
        a[0].localeCompare(b[0]),
      );
      for (const [category, items] of sorted2) {
        cllList += `☆ [font=double_struck]${String(category).toUpperCase().replaceAll("_", " ")}[:font=double_struck]\n\n`;
        cllList += items
          .map(
            ({ metadata, amount }) =>
              `${metadata.icon} ${amount > 1 ? `**x${pCy(amount)}**` : ""} ${metadata.name} (${metadata.key})`,
          )
          .join("\n");
        cllList += "\n\n";
      }

      /*let cllList = collectibles
        .getAll()
        .map(
          ({ metadata, amount }) =>
            `${metadata.icon} ${amount > 1 ? `**x${pCy(amount)}**` : ""} ${metadata.name} (${metadata.key})`,
        )
        .join("\n");*/
      return output.reply(
        (otherTarget ? `✅ Checking ${otherTarget.name ?? "Chara"}\n\n` : "") +
          `✪ ✦ **Classic Items**: (**${inventory.getAll().length}/8**)\n\n${itemList.trim() || "No items available."}\n\n✪ ✦ **Collectibles**:\n\n${cllList.trim()}`,
      );
      break;
    }

    case "check":
      const keyToCheck = actionArgs[0];
      if (!keyToCheck) {
        return output.reply("❌ Please specify an item key to check.");
      }
      const altKey = actionArgs
        .map((key, index) => {
          if (index !== 0) {
            return `${key.charAt(0)?.toUpperCase()}${key.slice(1).toLowerCase()}`;
          } else {
            return key.toLowerCase();
          }
        })
        .join("");
      const lastKey = inventory
        .getAll()
        .find((item) => item.name === actionArgs.join(" "));
      const item =
        inventory.getOne(keyToCheck) ||
        inventory.getOne(altKey) ||
        inventory.getOne(lastKey);
      if (!item) {
        return output.reply(
          `Item with key "${keyToCheck}" not found in your inventory.`,
        );
      }
      const { icon, name, flavorText } = item;
      return output.reply(
        `${icon} **${name}** (${inventory.getAmount(keyToCheck)})\n✦ ${flavorText}\n\n***Type:*** ${item.type}\nHeals ${item.heal ?? 0}HP\n+ ${item.def ?? 0} DEF\n+ ${item.atk ?? 0} ATK\n🐾 Saturation: ${(item.saturation ?? 0) / 60 / 1000} minutes.\n\n***Sell Price***: $${item.sellPrice ?? 0}💵`,
      );

    case "toss":
      const key = actionArgs[0];
      const keyOrAmount = actionArgs[1];
      if (!keyOrAmount || !key) {
        return output.reply("❌ Please specify an item key or 'all' to toss.");
      }
      let amount =
        keyOrAmount.toLowerCase() === "all" ? "all" : parseInt(keyOrAmount);
      if (amount === "all" || !isNaN(amount)) {
        if (amount === "all") {
          const items = inventory.get(key);
          amount = items.length;
        }
        const cannot = inventory.get(key).filter((i) => i?.cannotToss === true);
        const deletedCount = inventory.toss(
          key,
          Math.max(amount - cannot.length, 0),
        );
        await money.set(input.senderID, {
          inventory: Array.from(inventory),
        });
        const failedToss =
          cannot.length > 0
            ? "\n\n" +
              cannot.map((i) => `❌ ${i.icon} ${i.name} (${i.key})`).join("\n")
            : "";
        if (deletedCount === 0) {
          return output.reply("No items were tossed." + failedToss);
        }
        return output.reply(
          `${deletedCount} item(s) tossed from your inventory.` + failedToss,
        );
      } else {
        return output.reply(
          "❌ Invalid amount. Please specify a number or 'all'.",
        );
      }
    case "send_new":
      return output.reply(
        `❌ You need a **Shadow Bag** to perform this action.`,
      );
    case "send":
      let [keyT, recipientID, amountItem = 1] = actionArgs;
      amountItem = parseInt(amountItem);
      if (recipientID === input.senderID) {
        return output.reply(
          `❌ You cannot send items to yourself, I already tried.`,
        );
      }
      if (!inventory.has(keyT)) {
        return output.reply(
          `❌ You don't have any "${keyT}" in your inventory.`,
        );
      }
      if (!inventory.hasAmount(keyT, amountItem) || amountItem < 1) {
        return output.reply(
          `❌ Please enter a valid amount of "${keyT}", you currently have ${inventory.getAmount(keyT)} of it.`,
        );
      }
      const allUsers = await money.getAll();
      const recipientData = allUsers[recipientID];
      if (!recipientData) {
        return output.reply(`❌ User with ID "${recipientID}" not found.`);
      }
      const rInventory = new Inventory(recipientData.inventory);
      if (rInventory.getAll().length >= 8) {
        return output.reply(`❌ The recipient's inventory is full.`);
      }
      if (rInventory.getAll().length + amountItem > 8) {
        return output.reply(
          `❌ The recipient's inventory currently have ${rInventory.getAll().length}/8 items and you're trying to send ${amountItem} items.`,
        );
      }
      let sentItems = [];
      let failItems = [];
      for (let i = 0; i < amountItem; i++) {
        const itemToSend = inventory.getOne(keyT);
        if (itemToSend?.cannotSend) {
          failItems.push({ ...itemToSend, error: `Item cannot be sent.` });
          continue;
        }

        rInventory.addOne(itemToSend);
        inventory.deleteOne(keyT);
        sentItems.push(itemToSend);
      }

      await money.set(input.senderID, {
        inventory: Array.from(inventory),
      });
      await money.set(recipientID, {
        inventory: Array.from(rInventory),
      });

      await output.reply(
        `${sentItems.length !== 0 ? `✅ Sent ${sentItems.length} items to ${recipientData.name ?? "Chara"}` : `❌ No items were sent to ${recipientData.name ?? "Chara"}`}\n\n${[...sentItems, ...failItems].map((i) => `${i.icon} ${i.name}${i.error ? `\n❌ ${i.error}\n` : ""}`).join("\n")}`,
      );
      break;
    case "use":
      {
        const [key] = actionArgs;
        if (!key) {
          return output.reply(`❌ Please specify an item key to use.`);
        }
        const eKey = "--unequip";
        let item = inventory.getOne(key);
        if (!item && !String(key).startsWith(eKey)) {
          return output.reply(
            `❌ Item with key "${key}" not found in your inventory.`,
          );
        }
        item ??= {};
        /*if (!item.canUse) {
        return output.reply(`❌ This item has no direct usage here.`);
      }*/
        if (
          item.type === "armor" ||
          item.type === "weapon" ||
          key.startsWith(eKey)
        ) {
          if (petsData.getAll().length === 0) {
            return output.reply(`❌ You don't have any pets to use this item.`);
          }
          const i = await output.reply(
            `**Choose a pet name to equip this item:** (Also try <pet name> <armor slot number> for armors)\n\n${getPetList(petsData, gearsData, item, 0)}`,
          );
          input.setReply(i.messageID, {
            key: commandName,
            callback: handleEquip,
          });
          async function handleEquip(ctx) {
            if (ctx.input.senderID !== input.senderID) {
              return;
            }
            const userData = await ctx.money.get(ctx.input.senderID);
            const { inventory, petsData, gearsData } = getDatas(userData);
            item ??= {};
            if (!key.startsWith(eKey) && !inventory.has(item.key)) {
              return ctx.output.reply(
                `❓ Where did the item go? I can't find it from your inventory.`,
              );
            }

            const petName = String(ctx.input.words[0]);
            let slot = parseInt(ctx.input.words[1]) - 1;
            if (isNaN(slot)) {
              slot = 0;
            }
            let pet = petsData
              .getAll()
              .find(
                (i) =>
                  String(i.name).toLowerCase().trim() ===
                  petName.toLowerCase().trim(),
              );
            if (!pet) {
              return ctx.output.reply(
                `❌ You don't have a pet named "${petName}"`,
              );
            }
            const gearData = gearsData.getGearData(pet.key);
            const [, keyType] = key.split("_");
            item ??= {};

            if (item.type === "armor") {
              const oldArmor = gearData.equipArmor(slot, item);
              inventory.deleteOne(item.key);

              if (oldArmor) {
                inventory.addOne(oldArmor);
              }
            } else if (item.type === "weapon") {
              const oldWeapon = gearData.equipWeapon(item);
              inventory.deleteOne(item.key);
              if (oldWeapon) {
                inventory.addOne(oldWeapon);
              }
            } else if (keyType === "armor") {
              const oldArmor = gearData.equipArmor(slot, item);

              if (oldArmor) {
                if (inventory.getAll().length >= 8) {
                  return ctx.output.reply(`❌ You're carrying too many items`);
                }
                inventory.addOne(oldArmor);
              }
            } else if (keyType === "weapon") {
              const oldWeapon = gearData.equipWeapon(item);

              if (oldWeapon) {
                if (inventory.getAll().length >= 8) {
                  return ctx.output.reply(`❌ You're carrying too many items`);
                }
                inventory.addOne(oldWeapon);
              }
            } else {
              return ctx.output.reply(
                `❌ This item is no longer an armor or weapon, what bug are you trying to discover? Or maybe wrong syntax for ${eKey}_armor or ${eKey}_weapon`,
              );
            }
            gearsData.setGearData(pet.key, gearData);
            await ctx.money.set(ctx.input.senderID, {
              inventory: Array.from(inventory),
              gearsData: gearsData.toJSON(),
            });
            await ctx.output.reply(
              `✅ Equipped **${item.icon}** **${item.name}** to **${pet.name}**. (use inv use --unequip_armor or --unequip_weapon to unequip.)\n\n${getPetList(petsData, gearsData, {}, 0)}`,
            );
          }
          return;
        }
        if (item.type === "cheque") {
          const userInventory = inventory;
          let chequeKey = actionArgs[0];
          if (!String(chequeKey).startsWith("cheque_")) {
            chequeKey = `cheque_${chequeKey}`;
          }
          const itemToCash = userInventory.getOne(chequeKey);

          if (
            !itemToCash ||
            !chequeKey.startsWith("cheque_") ||
            itemToCash?.type !== "cheque"
          ) {
            return output.reply(
              `❌ No valid cheque found with the specified key.`,
            );
          }

          const chequeAmount = parseInt(itemToCash.chequeAmount);

          if (isNaN(chequeAmount) || chequeAmount <= 0) {
            return output.reply(`❌ The cheque amount is invalid.`);
          }

          userInventory.deleteOne(chequeKey);
          userData.money += chequeAmount;

          await money.set(input.senderID, {
            inventory: Array.from(userInventory),
            money: userData.money,
          });

          return output.reply(
            `✅ Cashed a cheque worth $${chequeAmount}. Your new balance is $${userData.money}.`,
          );
        }
        if (item.type === "potion") {
          return output.reply(
            item.useText ??
              `✦ A potion? What is a **potion**? Can you eat it? can you drink it? CAN YOU INJECT IT!??

${item.icon} **${item.name}**: "Shut up ${item.name} is taking a NAP!"

✦ Since when did items learned how to **talk**?`,
          );
        }
        if (item.type !== "treasure") {
          const flavorText =
            item.useText ??
            `You used ${item.icon} ${item.name}, nothing happened.`;
          return output.reply(`✅ ${flavorText}`);
        }
        /*const treasureItem = generateTreasure(item.treasureKey);
        if (!treasureItem) {
          return output.reply(`${item.icon} The treasure failed to open.`);
        }*/
        let diaCost = 5;
        let tresCount = item.tresCount || 5;
        const author = input.senderID;
        let chosenNumbers = [];
        async function handleTriple(ctx) {
          const { input, output, money } = ctx;

          if (author !== ctx.input.senderID) {
            return;
          }
          const userData = await ctx.money.get(ctx.input.senderID);
          const { inventory, collectibles } = getDatas(userData);

          const { treasures, paidMode } = ctx.repObj;

          if (paidMode && !collectibles.hasAmount("gems", diaCost)) {
            return output.reply(`❌ | You cannot afford a retry.`);
          }
          if (paidMode && String(input.words[0]).toLowerCase() !== "retry") {
            return;
          }
          if (paidMode) {
            input.words.shift();
          }

          if (!inventory.has(item.key) && !paidMode) {
            return output.reply(
              `❌ | Where did the item go? I can't find it from your inventory.`,
            );
          }
          let number = parseInt(input.words[0]);
          if (chosenNumbers.includes(number)) {
            return output.reply(`❌ | You already chose this number.`);
          }
          if (chosenNumbers.length >= tresCount) {
            return output.reply(`❌ | There's nothing to choose.`);
          }
          if (isNaN(number) || number < 1 || number > tresCount) {
            return output.reply(
              `❌ | Please go back to the previous message and reply a number **between 1 to ${tresCount}.**`,
            );
          }
          const treasure = treasures[number - 1];
          if (!treasure) {
            return output.reply(`❌ | The treasure failed to open, weird.`);
          }
          if (inventory.getAll().length >= 8) {
            return output.reply(`❌ | You're carrying too many items!`);
          }
          inventory.addOne(treasure);
          if (paidMode) {
            collectibles.raise("gems", -diaCost);
          }
          const treasureItem = treasure;
          if (!paidMode) {
            inventory.deleteOne(key);
          }
          input.delReply(ctx.detectID);

          await money.set(input.senderID, {
            inventory: Array.from(inventory),
            collectibles: Array.from(collectibles),
          });
          chosenNumbers.push(number);

          const infoDone = await output.replyStyled(
            `${item.icon} You opened ${item.name}!

${treasures.map((i) => i.icon).join(" | ")}
${collectibles.hasAmount("gems", diaCost) ? `\n[font=typewriter]Retry for 💎 ${diaCost}[:font=typewriter]\n[font=typewriter](retry <number>)[:font=typewriter]` : ""}

**Reward Details:**
Name: **${treasureItem.icon}** **${treasureItem.name}**
Info: ${treasureItem.flavorText}

Type **inv check ${treasureItem.key}** for more details!

💎 **${pCy(collectibles.getAmount("gems"))}** ${paidMode ? `(-${diaCost})` : ""}`,
            style,
          );
          treasures[number - 1] = {
            icon: "✅",
            isNothing: true,
          };
          input.setReply(infoDone.messageID, {
            key: "inventory",
            callback: handleTriple,
            paidMode: true,

            treasures,
          });
        }
        /*inventory.addOne(treasureItem);
        inventory.deleteOne(key);
        await money.set(input.senderID, {
          inventory: Array.from(inventory),
        });*/
        /*await output.reply(`${item.icon} You opened ${item.name}!

**Reward Details:**
Name: **${treasureItem.icon}** **${treasureItem.name}**
Info: ${treasureItem.flavorText}

Type **inv check ${treasureItem.key}** for more details!`);*/

        let treasures = [];
        for (let i = 0; i < tresCount; i++) {
          let newTreasure;
          do {
            newTreasure = generateTreasure(item.treasureKey);
          } while (
            /* treasures.some(
              (t) => t.key === newTreasure.key || t.icon === newTreasure.icon
            )*/
            false
          );
          treasures.push(newTreasure);
        }
        treasures = treasures.sort(() => Math.random() - 0.5);
        const info = await output.reply(
          `✦ Choose a treasure to open:\n\n${Array(tresCount).fill(item.icon).join(" | ")}\n\nReply with a **number** from **1** to **${tresCount}**.`,
        );
        input.setReply(info.messageID, {
          key: "inventory",
          callback: handleTriple,
          treasures,
        });
      }
      break;

    default:
      return output.reply(
        `❌ Invalid action. Usage:\n\n` +
          `\`${meta.usage.replace("{prefix}", prefix)} list <optional id>\`: Lists all items in the inventory.\n` +
          `\`${meta.usage.replace("{prefix}", prefix)} check <key>\`: Checks details of a specific item.\n` +
          `\`${meta.usage.replace("{prefix}", prefix)} toss <key> <amount | 'all'>\`: Deletes one or more items from the inventory.\n` +
          `\`${meta.usage.replace("{prefix}", prefix)} send <key> <id>\`: Transfers one or more items from the inventory into one another.\n` +
          `\`${meta.usage.replace("{prefix}", prefix)} use <key> Uses an item from your inventory.`,
      );
  }
}
