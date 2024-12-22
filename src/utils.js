require('colors');
const chalk = require('chalk');

const delay = async (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function displayHeader() {
    process.stdout.write('\x1Bc');
    console.log(chalk.yellow('╔════════════════════════════════════════╗'));
    console.log(chalk.yellow('║      🚀  小草空投机器人  🚀            ║'));
    console.log(chalk.yellow('║  👤                                    ║'));
    console.log(chalk.yellow('║  📢                                    ║'));
    console.log(chalk.yellow('╚════════════════════════════════════════╝'));
    console.log();
}

module.exports = { delay, displayHeader };
