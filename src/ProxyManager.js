require('colors');
const axios = require('axios');
const fs = require('fs');

const PROXY_SOURCES = {
  '服务器 1': 'https://files.ramanode.top/airdrop/grass/server_1.txt',
  '服务器 2': 'https://files.ramanode.top/airdrop/grass/server_2.txt',
  '服务器 3': 'https://files.ramanode.top/airdrop/grass/server_3.txt',
  '服务器 4': 'https://files.ramanode.top/airdrop/grass/server_4.txt',
  '服务器 5': 'https://files.ramanode.top/airdrop/grass/server_5.txt',
  '服务器 6': 'https://files.ramanode.top/airdrop/grass/server_6.txt',
};

async function fetchProxies(url) {
  try {
    const response = await axios.get(url);
    console.log(`\n已从 ${url} 获取代理`.green);
    return response.data.split('\n').filter(Boolean);
  } catch (error) {
    console.error(`无法从 ${url} 获取代理：${error.message}`.red);
    return [];
  }
}

async function readLines(filename) {
  try {
    const data = await fs.promises.readFile(filename, 'utf-8');
    console.log(`已从 ${filename} 加载数据`.green);
    return data.split('\n').filter(Boolean);
  } catch (error) {
    console.error(`读取 ${filename} 失败：${error.message}`.red);
    return [];
  }
}

async function selectProxySource(inquirer) {
  const choices = [...Object.keys(PROXY_SOURCES), 'CUSTOM', 'NO PROXY'];
  const { source } = await inquirer.prompt([
    {
      type: 'list',
      name: 'source',
      message: '选择代理来源：'.cyan,
      choices,
    },
  ]);

  if (source === 'CUSTOM') {
    const { filename } = await inquirer.prompt([
      {
        type: 'input',
        name: 'filename',
        message: '输入您的 proxy.txt 文件路径：'.cyan,
        default: 'proxy.txt',
      },
    ]);
    return { type: 'file', source: filename };
  } else if (source === '无代理') {
    return { type: 'none' };
  }

  return { type: 'url', source: PROXY_SOURCES[source] };
}

module.exports = { fetchProxies, readLines, selectProxySource };
