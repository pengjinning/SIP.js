/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-use-before-define */
import {
  SessionDescriptionHandlerOptions,
  SimpleUser,
  SimpleUserDelegate,
  SimpleUserOptions
} from "../lib/platform/web/index.js";
import { nameAlice, nameBob, uriAlice, uriBob, webSocketServerAlice, webSocketServerBob } from "./demo-users.js";
import { getButton, getDiv, getInput } from "./demo-utils.js";

// 扩展 SimpleUser 以处理数据通道设置和使用的类
class SimpleUserWithDataChannel extends SimpleUser {
  private _dataChannel: RTCDataChannel | undefined;

  constructor(
    private messageInput: HTMLInputElement,
    private sendButton: HTMLButtonElement,
    private receiveDiv: HTMLDivElement,
    server: string,
    options: SimpleUserOptions = {}
  ) {
    super(server, options);
  }

  public get dataChannel(): RTCDataChannel | undefined {
    return this._dataChannel;
  }

  public set dataChannel(dataChannel: RTCDataChannel | undefined) {
    this._dataChannel = dataChannel;
    if (!dataChannel) {
      return;
    }
    dataChannel.onclose = (event) => {
      console.log(`[${this.id}] 数据通道关闭`);
      this.messageInput.disabled = true;
      this.receiveDiv.classList.add("disabled");
      this.sendButton.disabled = true;
    };
    dataChannel.onerror = (event) => {
      console.error(`[${this.id}] 数据通道错误`);
      console.error((event as RTCErrorEvent).error);
      alert(`[${this.id}] 数据通道错误。\n` + (event as RTCErrorEvent).error);
    };
    dataChannel.onmessage = (event) => {
      console.log(`[${this.id}] 数据通道收到消息`);
      const el = document.createElement("p");
      el.classList.add("message");
      const node = document.createTextNode(event.data);
      el.appendChild(node);
      this.receiveDiv.appendChild(el);
      this.receiveDiv.scrollTop = this.receiveDiv.scrollHeight;
    };
    dataChannel.onopen = (event) => {
      console.log(`[${this.id}] 数据通道打开`);
      this.messageInput.disabled = false;
      this.receiveDiv.classList.remove("disabled");
      this.sendButton.disabled = false;
    };
  }

  public send(): void {
    const dc = this.dataChannel;
    if (!dc) {
      const error = "没有数据通道";
      console.error(`[${this.id}] 发送消息失败`);
      console.error(error);
      alert(`[${this.id}] 发送消息失败。\n` + error);
      return;
    }
    const msg = this.messageInput.value;
    if (!msg) {
      console.log(`[${this.id}] 没有要发送的数据`);
      return;
    }
    this.messageInput.value = "";
    switch (dc.readyState) {
      case "connecting":
        console.error("数据通道连接中时尝试发送消息。");
        break;
      case "open":
        try {
          dc.send(msg);
        } catch (error) {
          console.error(`[${this.id}] 发送消息失败`);
          console.error(error);
          alert(`[${this.id}] 发送消息失败。\n` + error);
        }
        break;
      case "closing":
        console.error("数据通道关闭中时尝试发送消息。");
        break;
      case "closed":
        console.error("数据通道连接已关闭时尝试发送消息。");
        break;
    }
  }
}

const connectAlice = getButton("connectAlice");
const connectBob = getButton("connectBob");
const disconnectAlice = getButton("disconnectAlice");
const disconnectBob = getButton("disconnectBob");
const registerAlice = getButton("registerAlice");
const registerBob = getButton("registerBob");
const unregisterAlice = getButton("unregisterAlice");
const unregisterBob = getButton("unregisterBob");
const beginAlice = getButton("beginAlice");
const beginBob = getButton("beginBob");
const endAlice = getButton("endAlice");
const endBob = getButton("endBob");
const messageAlice = getInput("messageAlice");
const sendAlice = getButton("sendAlice");
const receiveAlice = getDiv("receiveAlice");
const messageBob = getInput("messageBob");
const sendBob = getButton("sendBob");
const receiveBob = getDiv("receiveBob");
const AUTH_PASSWORD = "bytedesk123";

// 为 Alice 创建新的 SimpleUserWithDataChannel
const alice = buildUser(
  webSocketServerAlice,
  uriAlice,
  nameAlice,
  uriBob,
  nameBob,
  connectAlice,
  disconnectAlice,
  registerAlice,
  unregisterAlice,
  beginAlice,
  endAlice,
  messageAlice,
  sendAlice,
  receiveAlice
);

// 为 Bob 创建新的 SimpleUserWithDataChannel
const bob = buildUser(
  webSocketServerBob,
  uriBob,
  nameBob,
  uriAlice,
  nameAlice,
  connectBob,
  disconnectBob,
  registerBob,
  unregisterBob,
  beginBob,
  endBob,
  messageBob,
  sendBob,
  receiveBob
);

if (!alice || !bob) {
  console.error("出现错误");
}

function buildUser(
  webSocketServer: string,
  aor: string,
  displayName: string,
  targetAOR: string,
  targetName: string,
  connectButton: HTMLButtonElement,
  disconnectButton: HTMLButtonElement,
  registerButton: HTMLButtonElement,
  unregisterButton: HTMLButtonElement,
  beginButton: HTMLButtonElement,
  endButton: HTMLButtonElement,
  messageInput: HTMLInputElement,
  sendButton: HTMLButtonElement,
  receiveDiv: HTMLDivElement
): SimpleUser {
  console.log(`正在创建 "${displayName}" <${aor}>...`);
  const authUser = aor.match(/^sip:([^@]+)/)?.[1] || "";

  // SimpleUser 选项
  const options: SimpleUserOptions = {
    aor,
    media: {
      constraints: {
        // 此演示是进行"仅数据"通话
        audio: true, // 如果设置为 false，则 freeswitch 会报错，无法联通
        video: false
      }
    },
    userAgentOptions: {
      logLevel: "debug",
      displayName,
      authorizationUsername: authUser,
      authorizationPassword: AUTH_PASSWORD
    }
  };

  // 创建 SimpleUser
  const user = new SimpleUserWithDataChannel(messageInput, sendButton, receiveDiv, webSocketServer, options);

  // SimpleUser 委托
  const delegate: SimpleUserDelegate = {
    onCallCreated: makeCallCreatedCallback(user, beginButton, endButton),
    onCallReceived: makeCallReceivedCallback(user),
    onCallHangup: makeCallHangupCallback(user, beginButton, endButton),
    onRegistered: makeRegisteredCallback(user, registerButton, unregisterButton),
    onUnregistered: makeUnregisteredCallback(user, registerButton, unregisterButton),
    onServerConnect: makeServerConnectCallback(user, connectButton, disconnectButton, registerButton, beginButton),
    onServerDisconnect: makeServerDisconnectCallback(user, connectButton, disconnectButton, registerButton, beginButton)
  };
  user.delegate = delegate;

  // 设置连接按钮点击监听器
  connectButton.addEventListener(
    "click",
    makeConnectButtonClickListener(user, connectButton, disconnectButton, registerButton, beginButton)
  );

  // 设置断开连接按钮点击监听器
  disconnectButton.addEventListener(
    "click",
    makeDisconnectButtonClickListener(user, connectButton, disconnectButton, registerButton, beginButton)
  );

  // 设置注册按钮点击监听器
  registerButton.addEventListener("click", makeRegisterButtonClickListener(user, registerButton));

  // 设置取消注册按钮点击监听器
  unregisterButton.addEventListener("click", makeUnregisterButtonClickListener(user, unregisterButton));

  // 设置开始按钮点击监听器
  beginButton.addEventListener("click", makeBeginButtonClickListener(user, targetAOR, targetName));

  // 设置结束按钮点击监听器
  endButton.addEventListener("click", makeEndButtonClickListener(user));

  // 设置发送按钮点击监听器
  sendButton.addEventListener("click", () => user.send());

  // 启用连接按钮
  connectButton.disabled = false;

  return user;
}

// 创建接收呼叫回调的辅助函数
function makeCallReceivedCallback(user: SimpleUserWithDataChannel): () => void {
  return () => {
    console.log(`[${user.id}] 接收到呼叫`);
    // 如何在应答时创建数据通道时让会话描述处理程序回调的示例。
    const sessionDescriptionHandlerOptions: SessionDescriptionHandlerOptions = {
      onDataChannel: (dataChannel: RTCDataChannel) => {
        console.log(`[${user.id}] 数据通道已创建`);
        user.dataChannel = dataChannel;
      }
    };
    user.answer({ sessionDescriptionHandlerOptions }).catch((error: Error) => {
      console.error(`[${user.id}] 应答呼叫失败`);
      console.error(error);
      alert(`[${user.id}] 应答呼叫失败。\n` + error);
    });
  };
}

// 创建呼叫创建回调的辅助函数
function makeCallCreatedCallback(
  user: SimpleUser,
  beginButton: HTMLButtonElement,
  endButton: HTMLButtonElement
): () => void {
  return () => {
    console.log(`[${user.id}] 呼叫已创建`);
    beginButton.disabled = true;
    endButton.disabled = false;
  };
}

// 创建呼叫挂断回调的辅助函数
function makeCallHangupCallback(
  user: SimpleUser,
  beginButton: HTMLButtonElement,
  endButton: HTMLButtonElement
): () => void {
  return () => {
    console.log(`[${user.id}] 呼叫已挂断`);
    beginButton.disabled = !user.isConnected();
    endButton.disabled = true;
  };
}

// 创建注册回调的辅助函数
function makeRegisteredCallback(
  user: SimpleUser,
  registerButton: HTMLButtonElement,
  unregisterButton: HTMLButtonElement
): () => void {
  return () => {
    console.log(`[${user.id}] 已注册`);
    registerButton.disabled = true;
    unregisterButton.disabled = false;
  };
}

// 创建取消注册回调的辅助函数
function makeUnregisteredCallback(
  user: SimpleUser,
  registerButton: HTMLButtonElement,
  unregisterButton: HTMLButtonElement
): () => void {
  return () => {
    console.log(`[${user.id}] 已取消注册`);
    registerButton.disabled = !user.isConnected();
    unregisterButton.disabled = true;
  };
}

// 创建网络连接回调的辅助函数
function makeServerConnectCallback(
  user: SimpleUser,
  connectButton: HTMLButtonElement,
  disconnectButton: HTMLButtonElement,
  registerButton: HTMLButtonElement,
  beginButton: HTMLButtonElement
): () => void {
  return () => {
    console.log(`[${user.id}] 已连接`);
    connectButton.disabled = true;
    disconnectButton.disabled = false;
    registerButton.disabled = false;
    beginButton.disabled = false;
  };
}

// 创建网络断开回调的辅助函数
function makeServerDisconnectCallback(
  user: SimpleUser,
  connectButton: HTMLButtonElement,
  disconnectButton: HTMLButtonElement,
  registerButton: HTMLButtonElement,
  beginButton: HTMLButtonElement
): () => void {
  return (error?: Error) => {
    console.log(`[${user.id}] 已断开连接`);
    connectButton.disabled = false;
    disconnectButton.disabled = true;
    registerButton.disabled = true;
    beginButton.disabled = true;
    if (error) {
      console.error("makeServerDisconnectCallback:", error);
      alert(`[${user.id}] 服务器已断开连接。\n` + error.message);
    }
  };
}

// 设置连接按钮点击处理程序的辅助函数
function makeConnectButtonClickListener(
  user: SimpleUser,
  connectButton: HTMLButtonElement,
  disconnectButton: HTMLButtonElement,
  registerButton: HTMLButtonElement,
  beginButton: HTMLButtonElement
): () => void {
  return () => {
    user
      .connect()
      .then(() => {
        connectButton.disabled = true;
        disconnectButton.disabled = false;
        registerButton.disabled = false;
        beginButton.disabled = false;
      })
      .catch((error: Error) => {
        console.error(`[${user.id}] 连接失败`);
        console.error(error);
        alert(`[${user.id}] 连接失败。\n` + error);
      });
  };
}

// 设置断开连接按钮点击处理程序的辅助函数
function makeDisconnectButtonClickListener(
  user: SimpleUser,
  connectButton: HTMLButtonElement,
  disconnectButton: HTMLButtonElement,
  registerButton: HTMLButtonElement,
  beginButton: HTMLButtonElement
): () => void {
  return () => {
    user
      .disconnect()
      .then(() => {
        connectButton.disabled = false;
        disconnectButton.disabled = true;
        registerButton.disabled = true;
        beginButton.disabled = true;
      })
      .catch((error: Error) => {
        console.error(`[${user.id}] 断开连接失败`);
        console.error(error);
        alert(`[${user.id}] 断开连接失败。\n` + error);
      });
  };
}

// 设置注册按钮点击处理程序的辅助函数
function makeRegisterButtonClickListener(user: SimpleUser, registerButton: HTMLButtonElement): () => void {
  return () => {
    user
      .register({
        // 如何获取 SIP 响应消息进行自定义处理的示例
        requestDelegate: {
          onReject: (response) => {
            console.warn(`[${user.id}] REGISTER 被拒绝`);
            let message = `"${user.id}" 的注册被拒绝。\n`;
            message += `原因: ${response.message.reasonPhrase}\n`;
            console.warn("makeRegisterButtonClickListener:", message);
            alert(message);
          }
        }
      })
      .then(() => {
        registerButton.disabled = true;
      })
      .catch((error: Error) => {
        console.error(`[${user.id}] 注册失败`);
        console.error(error);
        alert(`[${user.id}] 注册失败。\n` + error);
      });
  };
}

// 设置取消注册按钮点击处理程序的辅助函数
function makeUnregisterButtonClickListener(user: SimpleUser, unregisterButton: HTMLButtonElement): () => void {
  return () => {
    user
      .unregister()
      .then(() => {
        unregisterButton.disabled = true;
      })
      .catch((error: Error) => {
        console.error(`[${user.id}] 取消注册失败`);
        console.error(error);
        alert(`[${user.id}] 取消注册失败。\n` + error);
      });
  };
}

// 设置开始按钮点击处理程序的辅助函数
function makeBeginButtonClickListener(
  user: SimpleUserWithDataChannel,
  target: string,
  targetDisplay: string
): () => void {
  return () => {
    // 如何让会话描述处理程序在生成初始提议时创建数据通道以及如何在创建数据通道时让会话描述处理程序回调的示例。
    const sessionDescriptionHandlerOptions: SessionDescriptionHandlerOptions = {
      dataChannel: true,
      onDataChannel: (dataChannel: RTCDataChannel) => {
        console.log(`[${user.id}] 数据通道已创建`);
        user.dataChannel = dataChannel;
      }
    };
    user
      .call(
        target,
        { sessionDescriptionHandlerOptions },
        {
          // 如何获取 SIP 响应消息进行自定义处理的示例
          requestDelegate: {
            onReject: (response) => {
              console.warn(`[${user.id}] INVITE 被拒绝`);
              let message = `向 "${targetDisplay}" 发起会话邀请被拒绝。\n`;
              message += `原因: ${response.message.reasonPhrase}\n`;
              message += `可能 "${targetDisplay}" 没有连接或未注册？\n`;
              console.warn("makeBeginButtonClickListener:", message);
              alert(message);
            }
          }
        }
      )
      .catch((error: Error) => {
        console.error(`[${user.id}] 开始会话失败`);
        console.error(error);
        alert(`[${user.id}] 开始会话失败。\n` + error);
      });
  };
}

// 设置结束按钮点击处理程序的辅助函数
function makeEndButtonClickListener(user: SimpleUser): () => void {
  return () => {
    user.hangup().catch((error: Error) => {
      console.error(`[${user.id}] 结束会话失败`);
      console.error(error);
      alert(`[${user.id}] 结束会话失败。\n` + error);
    });
  };
}

// 页面加载后自动连接 Alice 和 Bob
window.addEventListener("load", () => {
  const tryClick = (btn: HTMLButtonElement) => {
    if (!btn.disabled) {
      setTimeout(() => btn.click(), 0);
    }
  };
  tryClick(connectAlice);
  tryClick(connectBob);
});
