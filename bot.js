const tmi = require("tmi.js");

const game = {
  activePlayers: {},
  bettingActive: false,
  wallets: {},
  bettingPool: 0
};

const client = new tmi.Client({
  options: {
    debug: true
  },
  connection: {
    reconnect: true,
    secure: true
  },
  identity: {
    username: process.env.BOT_USERNAME,
    password: process.env.OAUTH_TOKEN
  },
  channels: [process.env.CHANNEL_NAME]
});

client.connect();

function getWallet(user) {
  if (!game.wallets[user.username]) {
    game.wallets[user.username] = {
      amount: 1000
    };
  }

  return game.wallets[user.username];
}

function reply(user, message) {
  client.say(process.env.CHANNEL_NAME, message);
}

client.on("chat", function(channel, user, message, self) {
  // Don't listen to my own messages..
  if (self) return;

  if (typeof message === "string" && message.indexOf("!gamble1") === 0) {


    const [command, gambleAmount] = message.toLowerCase().split(" ");
    
    if (isNaN(gambleAmount)) {
      reply(user, `Please enter a valid amount`, true);
      return;
    }
    
    const gambleAmountInt = parseInt(gambleAmount)

    const wallet = getWallet(user);

    if (wallet.amount < gambleAmountInt) {
      reply(user, `You only have ${wallet.amount} coins to gamble with`);
      return;
    }
    
    const roll = Math.floor(Math.random() * 100) + 1;
    
    let wonAmount;
    
    if (roll === 100) {
      wonAmount = (gambleAmountInt *= 2);
    } else if (roll >= 50) {
      wonAmount = gambleAmountInt
    } else {
      wonAmount = -gambleAmountInt;
    }
    
    game.wallets[user.username].amount += wonAmount;
    
    reply(user, `Rolled ${roll}, ${user.username} won ${wonAmount} Points and now has ${game.wallets[user.username].amount} Points`)
  }

  if (message === "!play") {
    game.activePlayers[user.username] = Object.assign(user, {
      betOnBy: {}
    });
  }

  if (message === "!currency") {
    const wallet = getWallet(user);

    reply(user, `${user.username} has ${wallet.amount} coins to bet with`);
  }

  if (typeof message === "string" && message.indexOf("!bet") === 0) {
    if (game.bettingActive === false) {
      reply(user, `Bets are closed`, true);
      return;
    }

    const [command, betOnUser, betAmount] = message.toLowerCase().split(" ");

    if (!game.activePlayers[betOnUser]) {
      reply(user, `${betOnUser} is not in this game`, true);
      return;
    }

    if (isNaN(betAmount)) {
      reply(user, `Please enter a valid amount`, true);
      return;
    }

    const wallet = getWallet(user);

    if (wallet.amount < betAmount) {
      reply(user, `You only have ${wallet.amount} coins to bet with`);
      return;
    }

    game.wallets[user.username].amount -= betAmount;
    game.activePlayers[betOnUser].betOnBy[user.username] = user;
    game.bettingPool += betAmount;

    reply(user, `You have placed a ${betAmount} bet on ${betOnUser}`, true);
  }

  if (user.username === process.env.ADMIN_USERNAME) {
    
    if (message === "!closebets") {
      game.bettingActive = false;
      reply(user, `Bets are closed`);
    }

    if (typeof message === "string" && message.indexOf("!winner") === 0) {
      
      const [command, winningUser] = message.toLowerCase().split(" ");

      if (!game.activePlayers[winningUser]) {
        reply(user, `${winningUser} was not playing the game`);
        return;
      }

      const winningBetters = game.activePlayers[winningUser].betOnBy;
      const winningBettersCollection = Object.keys(winningBetters);
      const totalWinners = winningBettersCollection.length;
      const prizePerBetter = game.bettingPool / totalWinners;

      winningBettersCollection.map(better => {
        game.wallets[better].ammount =
          game.wallets[better].ammount + prizePerBetter;
        reply(
          winningBetters[better],
          `You won ${prizePerBetter}, your total currency is ${game.wallets[better].ammount}`,
          true
        );
      });
    }

    if (message === "!reset") {
      game.activePlayers = {};
      game.bettingActive = true;
      game.bettingPool = 0;

      reply(user, `Reseting game`);
    }

    if (message === "!totalplayers") {
      reply(
        user,
        `${Object.keys(game.activePlayers).length} players in the game`
      );
    }
  }
});
