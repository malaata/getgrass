require('colors');
const WebSocket = require('ws');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpsProxyAgent } = require('https-proxy-agent');

const MAX_RETRIES = 5; // 最大重试次数
const RETRY_INTERVAL = 10000; // 重试间隔 10 秒
const PING_INTERVAL = 45000; // 心跳间隔设为 45 秒

class Bot {
  constructor(config) {
    this.config = config;
  }

  async getProxyIP(proxy) {
    const agent = proxy.startsWith('http')
      ? new HttpsProxyAgent(proxy)
      : new SocksProxyAgent(proxy);
    try {
      const response = await axios.get(this.config.ipCheckURL, {
        httpsAgent: agent,
      });
      console.log(`已通过代理 ${proxy} 连接`.green);
      return response.data;
    } catch (error) {
      console.error(
        `跳过代理 ${proxy}，因连接错误：${error.message}`.yellow
      );
      return null;
    }
  }

  async connectWithRetry(proxy, userID) {
    let attempts = 0;
    while (attempts < MAX_RETRIES) {
      try {
        await this.connectToProxy(proxy, userID);
        console.log(`成功连接到代理 ${proxy} 的用户 ID: ${userID}`);
        return;
      } catch (error) {
        console.error(`在代理 ${proxy} 上连接出错：${error.message}`);
        attempts++;
        console.log(`重试连接 (${attempts}/${MAX_RETRIES})...`);
        await this.delay(RETRY_INTERVAL);
      }
    }
    console.error(`无法连接到代理 ${proxy}，已达到最大重试次数。`);
  }

  async connectToProxy(proxy, userID) {
    const formattedProxy = proxy.startsWith('socks5://')
      ? proxy
      : proxy.startsWith('http')
      ? proxy
      : `socks5://${proxy}`;
    const proxyInfo = await this.getProxyIP(formattedProxy);

    if (!proxyInfo) {
      return;
    }

    try {
      const agent = formattedProxy.startsWith('http')
        ? new HttpsProxyAgent(formattedProxy)
        : new SocksProxyAgent(formattedProxy);
      const wsURL = `wss://${this.config.wssHost}`;
      const ws = new WebSocket(wsURL, {
        agent,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0',
          Pragma: 'no-cache',
          'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          OS: 'Windows',
          Platform: 'Desktop',
          Browser: 'Mozilla',
        },
      });

      ws.on('open', () => {
        console.log(`已连接到代理 ${proxy}`.cyan);
        console.log(`代理 IP 信息: ${JSON.stringify(proxyInfo)}`.magenta);
        this.sendPing(ws, proxyInfo.ip);
      });

      ws.on('message', (message) => {
        const msg = JSON.parse(message);
        console.log(`收到消息: ${JSON.stringify(msg)}`.blue);

        if (msg.action === 'AUTH') {
          const authResponse = {
            id: msg.id,
            origin_action: 'AUTH',
            result: {
              browser_id: uuidv4(),
              user_id: userID,
              user_agent: 'Mozilla/5.0',
              timestamp: Math.floor(Date.now() / 1000),
              device_type: 'desktop',
              version: '4.28.2',
            },
          };
          ws.send(JSON.stringify(authResponse));
          console.log(`发送认证响应: ${JSON.stringify(authResponse)}`.green);
        } else if (msg.action === 'PONG') {
          console.log(`收到 PONG: ${JSON.stringify(msg)}`.blue);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`WebSocket 已关闭，代码: ${code}，原因: ${reason}`.yellow);
        setTimeout(() => this.connectToProxy(proxy, userID), this.config.retryInterval);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket 在代理 ${proxy} 上出错：${error.message}`.red);
        if (error.message.includes('TLS') || error.message.includes('ECONNRESET')) {
          console.log('请检查代理的网络稳定性，或尝试更换代理服务器。'.yellow);
        }
        ws.terminate();
      });
    } catch (error) {
      console.error(`无法使用代理 ${proxy} 连接：${error.message}`.red);
    }
  }

  async connectDirectly(userID) {
    try {
      const wsURL = `wss://${this.config.wssHost}`;
      const ws = new WebSocket(wsURL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:92.0) Gecko/20100101 Firefox/92.0',
          Pragma: 'no-cache',
          'Accept-Language': 'uk-UA,uk;q=0.9,en-US;q=0.8,en;q=0.7',
          'Cache-Control': 'no-cache',
          OS: 'Windows',
          Platform: 'Desktop',
          Browser: 'Mozilla',
        },
      });

      ws.on('open', () => {
        console.log(`已直接连接，无需代理`.cyan);
        this.sendPing(ws, 'Direct IP');
      });

      ws.on('message', (message) => {
        const msg = JSON.parse(message);
        console.log(`收到消息: ${JSON.stringify(msg)}`.blue);

        if (msg.action === 'AUTH') {
          const authResponse = {
            id: msg.id,
            origin_action: 'AUTH',
            result: {
              browser_id: uuidv4(),
              user_id: userID,
              user_agent: 'Mozilla/5.0',
              timestamp: Math.floor(Date.now() / 1000),
              device_type: 'desktop',
              version: '4.28.2',
            },
          };
          ws.send(JSON.stringify(authResponse));
          console.log(`发送认证响应: ${JSON.stringify(authResponse)}`.green);
        } else if (msg.action === 'PONG') {
          console.log(`收到 PONG: ${JSON.stringify(msg)}`.blue);
        }
      });

      ws.on('close', (code, reason) => {
        console.log(`WebSocket 已关闭，代码: ${code}，原因: ${reason}`.yellow);
        setTimeout(() => this.connectDirectly(userID), this.config.retryInterval);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket 出错：${error.message}`.red);
        ws.terminate();
      });
    } catch (error) {
      console.error(`无法直接连接：${error.message}`.red);
    }
  }

  sendPing(ws, proxyIP) {
    setInterval(() => {
      const pingMessage = {
        id: uuidv4(),
        version: '1.0.0',
        action: 'PING',
        data: {},
      };
      ws.send(JSON.stringify(pingMessage));
      console.log(`发送 ping - IP: ${proxyIP}，消息: ${JSON.stringify(pingMessage)}`.cyan);
    }, PING_INTERVAL);
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = Bot;
