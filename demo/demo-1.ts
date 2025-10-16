/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
import { SimpleUser, SimpleUserDelegate, SimpleUserOptions } from "../lib/platform/web/index.js";
import { name as sipName, version as sipVersion } from "../lib/index.js";
import type { IncomingResponse } from "../lib/core/messages/incoming-response.js";
import { getAudio, getButton, getButtons, getInput, getSpan, getVideo } from "./demo-utils.js";
// Helper to get modal elements safely
const getEl = (id: string): HTMLElement => {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element "${id}" not found.`);
  return el;
};

const serverSpan = getSpan("server");
const serverInfoSpan = getSpan("serverInfo");
const targetSpan = getSpan("target");
const userDisplayNameSpan = getSpan("userDisplayName");
const userAorSpan = getSpan("userAor");
const userStatusSpan = getSpan("userStatus");
const uaNameSpan = getSpan("uaName");
const uaVersionSpan = getSpan("uaVersion");
const regExpiresSpan = getSpan("regExpires");
const regExpiryTimeSpan = getSpan("regExpiryTime");
const callStatusSpan = getSpan("callStatus");
const callPeerSpan = getSpan("callPeer");
const connectButton = getButton("connect");
const callButton = getButton("call");
const call1000Button = getButton("call1000");
const call1001Button = getButton("call1001");
const call1002Button = getButton("call1002");
const call1003Button = getButton("call1003");
const call1004Button = getButton("call1004");
const call1005Button = getButton("call1005");
const callCustomButton = getButton("callCustom");
const customNumberInput = getInput("customNumber");
const call9200Button = getButton("call9200");
const call9201Button = getButton("call9201");
const call9203Button = getButton("call9203");
const call5000Button = getButton("call5000");
const call3000Button = getButton("call3000");
const call3001Button = getButton("call3001");
const call3002Button = getButton("call3002");
// 视频呼叫按钮
const vcall1000Button = getButton("vcall1000");
const vcall1001Button = getButton("vcall1001");
const vcall1002Button = getButton("vcall1002");
const vcall1003Button = getButton("vcall1003");
const vcall1004Button = getButton("vcall1004");
const vcall1005Button = getButton("vcall1005");
const vcall3000Button = getButton("vcall3000");
const vcall3001Button = getButton("vcall3001");
const vcall3002Button = getButton("vcall3002");
const hangupButton = getButton("hangup");
const disconnectButton = getButton("disconnect");
// 音频/视频元素
const audioElement = getAudio("remoteAudio");
// 视频元素（本地/远端）
const videoLocalElement = getVideo("videoLocal");
const videoRemoteElement = getVideo("videoRemote");
const keypad = getButtons("keypad");
const dtmfSpan = getSpan("dtmf");
const holdCheckbox = getInput("hold");
const muteCheckbox = getInput("mute");
// Incoming modal elements
const incomingModal = getEl("incomingModal");
const incomingAccept = getButton("incomingAccept");
const incomingDecline = getButton("incomingDecline");

const showIncomingModal = (): void => {
  incomingModal.classList.remove("hidden");
};

const hideIncomingModal = (): void => {
  incomingModal.classList.add("hidden");
};

// —— 通用 UI 辅助：统一禁用所有外呼相关按钮 ——
const disableAllCallButtons = (): void => {
  // 音频外呼
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1001Button.disabled = true;
  call1002Button.disabled = true;
  call1003Button.disabled = true;
  call1004Button.disabled = true;
  call1005Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call9200Button.disabled = true;
  call9201Button.disabled = true;
  call9203Button.disabled = true;
  call5000Button.disabled = true;
  call3000Button.disabled = true;
  call3001Button.disabled = true;
  call3002Button.disabled = true;
  // 视频外呼
  vcall1000Button.disabled = true;
  vcall1001Button.disabled = true;
  vcall1002Button.disabled = true;
  vcall1003Button.disabled = true;
  vcall1004Button.disabled = true;
  vcall1005Button.disabled = true;
  vcall3000Button.disabled = true;
  vcall3001Button.disabled = true;
  vcall3002Button.disabled = true;
};

// —— 通用音频外呼 ——
const placeAudioCall = (uri: string): void => {
  disableAllCallButtons();
  hangupButton.disabled = true;
  dialingOut = true;
  activeUA = "audio";
  void playSafe(ringbackAudio);
  currentPeer = uri;
  callPeerSpan.innerHTML = uri;
  callStatusSpan.innerHTML = "正在呼叫";
  simpleUser
    .call(uri, { inviteWithoutSdp: false })
    .catch((error: Error) => {
      dialingOut = false;
      stopAudio(ringbackAudio);
      console.error(`[${simpleUser.id}] failed to place call to ${uri}`);
      console.error(error);
      alert(`Failed to place call to ${uri}.\n` + error);
      callStatusSpan.innerHTML = "空闲";
      callPeerSpan.innerHTML = "—";
      currentPeer = undefined;
      activeUA = undefined;
    });
};

// 通话状态标志
// dialingOut: 正在外呼但尚未建立；
// hasActiveCall: 已建立的通话（来电或去电）。
let dialingOut = false;
let hasActiveCall = false;
// 注册有效期倒计时定时器与到期时间
let regCountdownTimer: ReturnType<typeof setInterval> | undefined;
let regExpiryAt: number | undefined; // ms timestamp
let currentPeer: string | undefined;
type ActiveUA = "audio" | "video" | undefined;
let activeUA: ActiveUA = undefined;

// 提示音资源路径（使用仓库中已存在的文件）
// 外呼等待音：选择“phone-outgoing-call-72202.mp3”
// 来电铃声：选择“ringtone-027-376908.mp3”
const RINGBACK_URL = "./assets/sounds/phone-outgoing-call-72202.mp3"; // 外呼等待音
const RINGTONE_URL = "./assets/sounds/ringtone-027-376908.mp3"; // 来电铃声
const ringbackAudio = new Audio(RINGBACK_URL);
ringbackAudio.loop = true;
ringbackAudio.preload = "auto";
ringbackAudio.volume = 0.5;
const ringtoneAudio = new Audio(RINGTONE_URL);
ringtoneAudio.loop = true;
ringtoneAudio.preload = "auto";
ringtoneAudio.volume = 0.5;

const playSafe = async (audio: HTMLAudioElement): Promise<void> => {
  try {
    audio.currentTime = 0;
    await audio.play();
  } catch (e) {
    // 可能因浏览器自动播放策略被阻止，待用户交互后方可播放
    console.warn("提示音播放被阻止:", e);
  }
};
const stopAudio = (audio: HTMLAudioElement): void => {
  try {
    audio.pause();
    audio.currentTime = 0;
  } catch {
    // ignore
  }
};

// WebSocket Server URL
const webSocketServer = "wss://sip.weiyuai.cn/ws";
serverSpan.innerHTML = webSocketServer;
serverInfoSpan.innerHTML = webSocketServer;

// Demo user AOR and credentials
const aor = "sip:1006@sip.weiyuai.cn";
const AUTH_USER = "1006";
const AUTH_PASS = "bytedesk123";

// Destination URI
const target = "sip:echo@sip.weiyuai.cn";
targetSpan.innerHTML = target;

// Name for demo user
const displayName = "1006";
// Initialize user info panel
userDisplayNameSpan.innerHTML = displayName;
userAorSpan.innerHTML = aor;
userStatusSpan.innerHTML = "未连接";
uaNameSpan.innerHTML = sipName;
uaVersionSpan.innerHTML = String(sipVersion);
regExpiresSpan.innerHTML = "—";
regExpiryTimeSpan.innerHTML = "—";
callStatusSpan.innerHTML = "空闲";
callPeerSpan.innerHTML = "—";

// SimpleUser delegate
const simpleUserDelegate: SimpleUserDelegate = {
  onCallCreated: (): void => {
    console.log(`[${displayName}] Call created`);
    callButton.disabled = true;
    call1000Button.disabled = true;
    call1001Button.disabled = true;
    call1002Button.disabled = true;
    call1003Button.disabled = true;
    call1004Button.disabled = true;
    call1005Button.disabled = true;
    callCustomButton.disabled = true;
    customNumberInput.disabled = true;
    // 进入音频外呼
    activeUA = "audio";
    call9200Button.disabled = true;
    call9201Button.disabled = true;
    call9203Button.disabled = true;
    call5000Button.disabled = true;
    call3000Button.disabled = true;
    call3001Button.disabled = true;
    call3002Button.disabled = true;
    // 同时禁用视频外呼按钮
    vcall1000Button.disabled = true;
    vcall1001Button.disabled = true;
    vcall1002Button.disabled = true;
    vcall1003Button.disabled = true;
    vcall1004Button.disabled = true;
    vcall1005Button.disabled = true;
    vcall1000Button.disabled = true;
    vcall1001Button.disabled = true;
    vcall1002Button.disabled = true;
    vcall1003Button.disabled = true;
    vcall1004Button.disabled = true;
    vcall1005Button.disabled = true;
    vcall3000Button.disabled = true;
    vcall3001Button.disabled = true;
    vcall3002Button.disabled = true;
    hangupButton.disabled = false;
    keypadDisabled(true);
    holdCheckboxDisabled(true);
    muteCheckboxDisabled(true);
    callStatusSpan.innerHTML = "正在呼叫";
    if (currentPeer) callPeerSpan.innerHTML = currentPeer;
  },
  onCallAnswered: (): void => {
    console.log(`[${displayName}] Call answered`);
    // 通话已建立
    hasActiveCall = true;
    dialingOut = false;
    // 停止提示音
    stopAudio(ringbackAudio);
    stopAudio(ringtoneAudio);
    keypadDisabled(false);
    holdCheckboxDisabled(false);
    muteCheckboxDisabled(false);
    callStatusSpan.innerHTML = "通话中";
    if (currentPeer) callPeerSpan.innerHTML = currentPeer;
  },
  onCallReceived: (): void => {
    console.log(`[${displayName}] Incoming call received`);
    // 若正外呼或已有通话，则自动忙音拒接，避免弹窗干扰
    if (dialingOut || hasActiveCall) {
      console.log(
        `[${displayName}] Busy - auto decline incoming while ${dialingOut ? "dialing" : "in-call"}`
      );
      hideIncomingModal();
      simpleUser.decline().catch((e: Error) => {
        console.warn("自动拒接失败:", e);
      });
      return;
    }
    // 非忙时，播放来电铃声
    void playSafe(ringtoneAudio);
    callStatusSpan.innerHTML = "来电中";
    // 提示：要精准显示主叫号码，可在更底层 SessionManager 的 onInvite 中读取 From。
    if (!currentPeer) callPeerSpan.innerHTML = "未知";
    showIncomingModal();
  },
  onCallHangup: (): void => {
    console.log(`[${displayName}] Call hangup`);
    hideIncomingModal();
    // 会话结束，重置标志
    hasActiveCall = false;
    dialingOut = false;
    stopAudio(ringbackAudio);
    stopAudio(ringtoneAudio);
    callButton.disabled = false;
    call1000Button.disabled = false;
    call1001Button.disabled = false;
    call1002Button.disabled = false;
    call1003Button.disabled = false;
    call1004Button.disabled = false;
    call1005Button.disabled = false;
    callCustomButton.disabled = false;
    customNumberInput.disabled = false;
    call9200Button.disabled = false;
    call9201Button.disabled = false;
    call9203Button.disabled = false;
    call5000Button.disabled = false;
    call3000Button.disabled = false;
    call3001Button.disabled = false;
    call3002Button.disabled = false;
    // 恢复视频外呼按钮
    vcall1000Button.disabled = false;
    vcall1001Button.disabled = false;
    vcall1002Button.disabled = false;
    vcall1003Button.disabled = false;
    vcall1004Button.disabled = false;
    vcall1005Button.disabled = false;
    vcall3000Button.disabled = false;
    vcall3001Button.disabled = false;
    vcall3002Button.disabled = false;
    hangupButton.disabled = true;
    keypadDisabled(true);
    holdCheckboxDisabled(true);
    muteCheckboxDisabled(true);
    callStatusSpan.innerHTML = "空闲";
    callPeerSpan.innerHTML = "—";
    currentPeer = undefined;
  },
  onCallHold: (held: boolean): void => {
    console.log(`[${displayName}] Call hold ${held}`);
    holdCheckbox.checked = held;
  },
  onRegistered: (): void => {
    console.log(`[${displayName}] Registered as ${aor}`);
    userStatusSpan.innerHTML = "已注册";
  },
  onUnregistered: (): void => {
    console.log(`[${displayName}] Unregistered`);
    // 若仍连接但未注册
    userStatusSpan.innerHTML = simpleUser.isConnected() ? "未注册" : "未连接";
    // 清空注册有效期显示
    regExpiresSpan.innerHTML = "—";
    regExpiryTimeSpan.innerHTML = "—";
    stopRegCountdown();
    // 安全重置会话标志
    hasActiveCall = false;
    dialingOut = false;
    stopAudio(ringbackAudio);
    stopAudio(ringtoneAudio);
    callStatusSpan.innerHTML = "空闲";
    callPeerSpan.innerHTML = "—";
    currentPeer = undefined;
    // 连接断开/未注册状态下，禁用所有“音频通话”与“音频AI”相关按钮，防止误操作
    try {
      callButton.disabled = true;
      call1000Button.disabled = true;
      call1001Button.disabled = true;
      call1002Button.disabled = true;
      call1003Button.disabled = true;
      call1004Button.disabled = true;
      call1005Button.disabled = true;
      callCustomButton.disabled = true;
      customNumberInput.disabled = true;
      call9200Button.disabled = true;
      call9201Button.disabled = true;
      call9203Button.disabled = true;
      // 可选：IVR/会议亦为音频业务，通常也应禁用
      call5000Button.disabled = true;
      call3000Button.disabled = true;
      call3001Button.disabled = true;
      call3002Button.disabled = true;
    } catch {
      // no-op
    }
  }
};

// 音频 SimpleUser（保留原有音频通话能力）
const simpleUserOptions: SimpleUserOptions = {
  delegate: simpleUserDelegate,
  aor,
  media: {
    constraints: {
      audio: true,
      video: false
    },
    remote: {
      audio: audioElement
    }
  },
  // 让底层 Registerer 自动续注：在过期前按百分比进行 re-REGISTER
  // expires: 首次注册建议值（秒），refreshFrequency: 在剩余百分比时刷新（50-99）
  registererOptions: {
    expires: 600,
    refreshFrequency: 95
  },
  userAgentOptions: {
    logLevel: "debug",
    displayName,
    authorizationUsername: AUTH_USER,
    authorizationPassword: AUTH_PASS,
    // 优化 WebRTC 连接体验：缩短 ICE 超时并显式配置 STUN
    // 说明：默认已有 Google STUN；这里显式设置并将 ICE 收集超时从默认 5000ms 缩短到 2000ms，
    // 可减少外呼前等待（不影响对端 4xx/5xx 的业务结果）。
    sessionDescriptionHandlerFactoryOptions: {
      iceGatheringTimeout: 2000,
      peerConnectionConfiguration: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun.cloudflare.com:3478" }
        ]
      }
    }
  }
};

// SimpleUser construction（音频）
const simpleUser = new SimpleUser(webSocketServer, simpleUserOptions);

// 视频 SimpleUser（新增视频通话能力）
const videoUserDelegate: SimpleUserDelegate = {
  onCallCreated: (): void => {
    console.log(`[${displayName}][VIDEO] Call created`);
    activeUA = "video";
    // 禁用所有外呼按钮
    callButton.disabled = true;
    call1000Button.disabled = true;
    call1001Button.disabled = true;
    call1002Button.disabled = true;
    call1003Button.disabled = true;
    call1004Button.disabled = true;
    call1005Button.disabled = true;
    callCustomButton.disabled = true;
    customNumberInput.disabled = true;
    call9200Button.disabled = true;
    call5000Button.disabled = true;
    call3000Button.disabled = true;
    call3001Button.disabled = true;
    call3002Button.disabled = true;
    vcall3000Button.disabled = true;
    vcall3001Button.disabled = true;
    vcall3002Button.disabled = true;
    hangupButton.disabled = false;
    keypadDisabled(true);
    holdCheckboxDisabled(true);
    muteCheckboxDisabled(true);
    callStatusSpan.innerHTML = "正在呼叫";
    if (currentPeer) callPeerSpan.innerHTML = currentPeer;
  },
  onCallAnswered: (): void => {
    console.log(`[${displayName}][VIDEO] Call answered`);
    hasActiveCall = true;
    dialingOut = false;
    stopAudio(ringbackAudio);
    stopAudio(ringtoneAudio);
    keypadDisabled(false);
    holdCheckboxDisabled(false);
    muteCheckboxDisabled(false);
    callStatusSpan.innerHTML = "通话中";
    if (currentPeer) callPeerSpan.innerHTML = currentPeer;
  },
  onCallReceived: (): void => {
    // 避免双实例同时处理来电：视频实例自动拒接
    console.log(`[${displayName}][VIDEO] Incoming call -> auto decline`);
    videoUser.decline().catch((e: Error) => console.warn("视频来电自动拒接失败:", e));
  },
  onCallHangup: (): void => {
    console.log(`[${displayName}][VIDEO] Call hangup`);
    hasActiveCall = false;
    dialingOut = false;
    stopAudio(ringbackAudio);
    stopAudio(ringtoneAudio);
    // 复位按钮
    callButton.disabled = false;
    call1000Button.disabled = false;
    call1001Button.disabled = false;
    call1002Button.disabled = false;
    call1003Button.disabled = false;
    call1004Button.disabled = false;
    call1005Button.disabled = false;
    callCustomButton.disabled = false;
    customNumberInput.disabled = false;
    call9200Button.disabled = false;
    call5000Button.disabled = false;
    call3000Button.disabled = false;
    call3001Button.disabled = false;
    call3002Button.disabled = false;
    vcall3000Button.disabled = false;
    vcall3001Button.disabled = false;
    vcall3002Button.disabled = false;
    hangupButton.disabled = true;
    keypadDisabled(true);
    holdCheckboxDisabled(true);
    muteCheckboxDisabled(true);
    callStatusSpan.innerHTML = "空闲";
    callPeerSpan.innerHTML = "—";
    currentPeer = undefined;
    if (activeUA === "video") activeUA = undefined;
  },
  onCallHold: (held: boolean): void => {
    holdCheckbox.checked = held;
  },
  onRegistered: (): void => {
    console.log(`[${displayName}][VIDEO] Registered`);
  },
  onUnregistered: (): void => {
    console.log(`[${displayName}][VIDEO] Unregistered`);
  }
};

const videoUserOptions: SimpleUserOptions = {
  delegate: videoUserDelegate,
  aor,
  media: {
    constraints: {
      audio: true,
      video: true
    },
    local: {
      video: videoLocalElement
    },
    remote: {
      video: videoRemoteElement
    }
  },
  registererOptions: {
    expires: 600,
    refreshFrequency: 95
  },
  userAgentOptions: {
    logLevel: "debug",
    displayName,
    authorizationUsername: AUTH_USER,
    authorizationPassword: AUTH_PASS,
    // 与音频一致，优化 ICE 收集与连通性
    sessionDescriptionHandlerFactoryOptions: {
      iceGatheringTimeout: 2000,
      peerConnectionConfiguration: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          { urls: "stun:stun.cloudflare.com:3478" }
        ]
      }
    }
  }
};

const videoUser = new SimpleUser(webSocketServer, videoUserOptions);

// Add click listener to connect button
connectButton.addEventListener("click", () => {
  connectButton.disabled = true;
  disconnectButton.disabled = true;
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1001Button.disabled = true;
  call1002Button.disabled = true;
  call1003Button.disabled = true;
  call1004Button.disabled = true;
  call1005Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call9200Button.disabled = true;
  call9201Button.disabled = true;
  call9203Button.disabled = true;
  call3000Button.disabled = true;
  call3001Button.disabled = true;
  call3002Button.disabled = true;
  vcall3000Button.disabled = true;
  vcall3001Button.disabled = true;
  vcall3002Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser
    .connect()
    .then(() => {
      userStatusSpan.innerHTML = "已连接";
      return simpleUser.register({
        requestDelegate: {
          onAccept: (response: IncomingResponse): void => {
            try {
              const contacts = response.message.getHeaders("contact");
              let expires: number | undefined = undefined;
              for (let i = 0; i < contacts.length; i++) {
                const raw = contacts[i];
                const m = /expires\s*=\s*(\d+)/i.exec(raw);
                if (m) {
                  expires = Number(m[1]);
                  break;
                }
              }
              if (expires === undefined && response.message.hasHeader("expires")) {
                const hdr = response.message.getHeader("expires");
                if (hdr) expires = Number(hdr);
              }

              if (typeof expires === "number" && !Number.isNaN(expires)) {
                // 启动倒计时展示（底层 Registerer 会根据 refreshFrequency 自动续期）
                startRegCountdown(expires);
              } else {
                regExpiresSpan.innerHTML = "未知";
                regExpiryTimeSpan.innerHTML = "—";
                stopRegCountdown();
              }
            } catch (e) {
              console.warn("解析 REGISTER 响应失败:", e);
              regExpiresSpan.innerHTML = "—";
              regExpiryTimeSpan.innerHTML = "—";
              stopRegCountdown();
            }
          }
        }
      });
    }) // connect 后自动注册
    .then(() => {
      connectButton.disabled = true;
      disconnectButton.disabled = false;
      connectButton.textContent = "已连接";
      callButton.disabled = false;
      call1000Button.disabled = false;
      call1001Button.disabled = false;
      call1002Button.disabled = false;
      call1003Button.disabled = false;
      call1004Button.disabled = false;
      call1005Button.disabled = false;
      callCustomButton.disabled = false;
      customNumberInput.disabled = false;
      call9200Button.disabled = false;
      call9201Button.disabled = false;
      call9203Button.disabled = false;
      call5000Button.disabled = false;
      call3000Button.disabled = false;
      call3001Button.disabled = false;
      call3002Button.disabled = false;
      vcall1000Button.disabled = false;
      vcall1001Button.disabled = false;
      vcall1002Button.disabled = false;
      vcall1003Button.disabled = false;
      vcall1004Button.disabled = false;
      vcall1005Button.disabled = false;
      vcall3000Button.disabled = false;
      vcall3001Button.disabled = false;
      vcall3002Button.disabled = false;
      hangupButton.disabled = true;
      userStatusSpan.innerHTML = "已注册";
    })
    .catch((error: Error) => {
      connectButton.disabled = false;
      connectButton.textContent = "连接";
      console.error(`[${simpleUser.id}] failed to connect/register`);
      console.error(error);
      alert("Failed to connect/register.\n" + error);
      userStatusSpan.innerHTML = "未连接";
    });
});

// Incoming modal button handlers
incomingAccept.addEventListener("click", () => {
  // 立即停止来电铃声
  stopAudio(ringtoneAudio);
  incomingAccept.disabled = true;
  incomingDecline.disabled = true;
  simpleUser
    .answer()
    .then(() => {
      hideIncomingModal();
      incomingAccept.disabled = false;
      incomingDecline.disabled = false;
    })
    .catch((error: Error) => {
      incomingAccept.disabled = false;
      incomingDecline.disabled = false;
      console.error(`[${simpleUser.id}] failed to answer call`);
      console.error(error);
      alert("Failed to answer call.\n" + error);
    });
});

incomingDecline.addEventListener("click", () => {
  // 立即停止来电铃声
  stopAudio(ringtoneAudio);
  incomingAccept.disabled = true;
  incomingDecline.disabled = true;
  simpleUser
    .decline()
    .then(() => {
      hideIncomingModal();
      incomingAccept.disabled = false;
      incomingDecline.disabled = false;
    })
    .catch((error: Error) => {
      incomingAccept.disabled = false;
      incomingDecline.disabled = false;
      console.error(`[${simpleUser.id}] failed to decline call`);
      console.error(error);
      alert("Failed to decline call.\n" + error);
    });
});

// Add click listener to call button
callButton.addEventListener("click", () => placeAudioCall(target));

// Add click listener to call 1000 button
call1000Button.addEventListener("click", () => placeAudioCall("sip:1000@sip.weiyuai.cn"));

// Add click listener to call 1002 button
call1002Button.addEventListener("click", () => placeAudioCall("sip:1002@sip.weiyuai.cn"));

// Add click listener to call 1001 button
call1001Button.addEventListener("click", () => placeAudioCall("sip:1001@sip.weiyuai.cn"));

// Add click listener to call 1003 button
call1003Button.addEventListener("click", () => placeAudioCall("sip:1003@sip.weiyuai.cn"));

// Add click listener to call 1004 button
call1004Button.addEventListener("click", () => placeAudioCall("sip:1004@sip.weiyuai.cn"));

// Add click listener to call 1005 button
call1005Button.addEventListener("click", () => placeAudioCall("sip:1005@sip.weiyuai.cn"));

// Add click listener to call custom number button
callCustomButton.addEventListener("click", () => {
  const raw = (customNumberInput.value || "").trim();
  if (!raw) {
    alert("请输入要拨打的号码。");
    return;
  }
  // 构造 SIP URI：允许用户直接输入完整 sip:URI；否则按号码拼接域名
  const targetUri = raw.startsWith("sip:") ? raw : `sip:${raw}@sip.weiyuai.cn`;

  callButton.disabled = true;
  call1000Button.disabled = true;
  call1002Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call9200Button.disabled = true;
  call5000Button.disabled = true;
  hangupButton.disabled = true;
  dialingOut = true;
  // 外呼等待音
  void playSafe(ringbackAudio);
  currentPeer = targetUri;
  callPeerSpan.innerHTML = currentPeer;
  callStatusSpan.innerHTML = "正在呼叫";
  simpleUser
    .call(targetUri, { inviteWithoutSdp: false })
    .catch((error: Error) => {
      dialingOut = false;
      stopAudio(ringbackAudio);
      console.error(`[${simpleUser.id}] failed to place call to ${targetUri}`);
      console.error(error);
      alert(`Failed to place call to ${targetUri}.\n` + error);
      callStatusSpan.innerHTML = "空闲";
      callPeerSpan.innerHTML = "—";
      currentPeer = undefined;
    });
});

// Add click listener to call 9201 button (Audio AI test)
call9201Button.addEventListener("click", () => placeAudioCall("sip:9201@sip.weiyuai.cn"));

// Add click listener to call 9203 button (Audio AI test)
call9203Button.addEventListener("click", () => placeAudioCall("sip:9203@sip.weiyuai.cn"));

// Add click listener to call 9200 button
call9200Button.addEventListener("click", () => placeAudioCall("sip:9200@sip.weiyuai.cn"));

// Add click listener to hangup button
hangupButton.addEventListener("click", () => {
  callButton.disabled = true;
  call1000Button.disabled = true;
  call9200Button.disabled = true;
  call5000Button.disabled = true;
  vcall3000Button.disabled = true;
  vcall3001Button.disabled = true;
  vcall3002Button.disabled = true;
  hangupButton.disabled = true;
  const ua = activeUA === "video" ? videoUser : simpleUser;
  ua.hangup().catch((error: Error) => {
    console.error(`[${simpleUser.id}] failed to hangup call`);
    console.error(error);
    alert("Failed to hangup call.\n" + error);
    callStatusSpan.innerHTML = "空闲";
    callPeerSpan.innerHTML = "—";
    currentPeer = undefined;
  });
});

// Add click listener to disconnect button
disconnectButton.addEventListener("click", () => {
  connectButton.disabled = true;
  disconnectButton.disabled = true;
  callButton.disabled = true;
  call9200Button.disabled = true;
  hangupButton.disabled = true;
  call1000Button.disabled = true;
  // 补充禁用其余音频按钮与音频AI按钮，避免断开后仍可点击
  call1001Button.disabled = true;
  call1002Button.disabled = true;
  call1003Button.disabled = true;
  call1004Button.disabled = true;
  call1005Button.disabled = true;
  call9201Button.disabled = true;
  call9203Button.disabled = true;
  call5000Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  Promise.resolve()
    .then(() => Promise.all([
      simpleUser.unregister().catch(() => undefined),
      videoUser.unregister().catch(() => undefined)
    ]))
    .then(() => Promise.all([
      simpleUser.disconnect().catch(() => undefined),
      videoUser.disconnect().catch(() => undefined)
    ]))
    .then(() => {
      connectButton.disabled = false;
      connectButton.textContent = "连接";
      disconnectButton.disabled = true;
      callButton.disabled = true;
      call1000Button.disabled = true;
      call1002Button.disabled = true;
      callCustomButton.disabled = true;
      customNumberInput.disabled = true;
      call9200Button.disabled = true;
      call5000Button.disabled = true;
      call3000Button.disabled = true;
      call3001Button.disabled = true;
      call3002Button.disabled = true;
      vcall1000Button.disabled = true;
      vcall1001Button.disabled = true;
      vcall1002Button.disabled = true;
      vcall1003Button.disabled = true;
      vcall1004Button.disabled = true;
      vcall1005Button.disabled = true;
      vcall3000Button.disabled = true;
      vcall3001Button.disabled = true;
      vcall3002Button.disabled = true;
      hangupButton.disabled = true;
      userStatusSpan.innerHTML = "未连接";
      regExpiresSpan.innerHTML = "—";
      regExpiryTimeSpan.innerHTML = "—";
      stopRegCountdown();
      hasActiveCall = false;
      dialingOut = false;
      // 确保停止所有提示音
      stopAudio(ringbackAudio);
      stopAudio(ringtoneAudio);
      callStatusSpan.innerHTML = "空闲";
      callPeerSpan.innerHTML = "—";
      currentPeer = undefined;
      activeUA = undefined;
    })
    .catch((error: Error) => {
      console.error(`[${simpleUser.id}] failed to disconnect`);
      console.error(error);
      alert("Failed to disconnect.\n" + error);
      userStatusSpan.innerHTML = "未连接";
    });
});

// Add click listeners to keypad buttons
keypad.forEach((button) => {
  button.addEventListener("click", () => {
    const tone = button.textContent;
    if (tone) {
      const ua = activeUA === "video" ? videoUser : simpleUser;
      ua.sendDTMF(tone).then(() => {
        dtmfSpan.innerHTML += tone;
      });
    }
  });
});

// ===== 视频外呼按钮：使用 videoUser =====
const placeVideoCall = (uri: string): void => {
  // 禁用全部外呼按钮
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1001Button.disabled = true;
  call1002Button.disabled = true;
  call1003Button.disabled = true;
  call1004Button.disabled = true;
  call1005Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call9200Button.disabled = true;
  call5000Button.disabled = true;
  call3000Button.disabled = true;
  call3001Button.disabled = true;
  call3002Button.disabled = true;
  vcall1000Button.disabled = true;
  vcall1001Button.disabled = true;
  vcall1002Button.disabled = true;
  vcall1003Button.disabled = true;
  vcall1004Button.disabled = true;
  vcall1005Button.disabled = true;
  vcall3000Button.disabled = true;
  vcall3001Button.disabled = true;
  vcall3002Button.disabled = true;
  hangupButton.disabled = true;
  dialingOut = true;
  activeUA = "video";
  void playSafe(ringbackAudio);
  currentPeer = uri;
  callPeerSpan.innerHTML = currentPeer;
  callStatusSpan.innerHTML = "正在呼叫";
  videoUser
    .connect()
    .then(() => videoUser.call(uri, { inviteWithoutSdp: false }))
    .catch((error: Error) => {
      dialingOut = false;
      stopAudio(ringbackAudio);
      console.error(`[${videoUser.id}] failed to place video call to ${uri}`);
      console.error(error);
      alert(`Failed to place video call to ${uri}.\n` + error);
      callStatusSpan.innerHTML = "空闲";
      callPeerSpan.innerHTML = "—";
      currentPeer = undefined;
      activeUA = undefined;
    });
};

vcall1000Button.addEventListener("click", () => placeVideoCall("sip:1000@sip.weiyuai.cn"));
vcall1001Button.addEventListener("click", () => placeVideoCall("sip:1001@sip.weiyuai.cn"));
vcall1002Button.addEventListener("click", () => placeVideoCall("sip:1002@sip.weiyuai.cn"));
vcall1003Button.addEventListener("click", () => placeVideoCall("sip:1003@sip.weiyuai.cn"));
vcall1004Button.addEventListener("click", () => placeVideoCall("sip:1004@sip.weiyuai.cn"));
vcall1005Button.addEventListener("click", () => placeVideoCall("sip:1005@sip.weiyuai.cn"));

vcall3000Button.addEventListener("click", () => {
  const uri = "sip:3000@sip.weiyuai.cn";
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1001Button.disabled = true;
  call1002Button.disabled = true;
  call1003Button.disabled = true;
  call1004Button.disabled = true;
  call1005Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call9200Button.disabled = true;
  call5000Button.disabled = true;
  call3000Button.disabled = true;
  call3001Button.disabled = true;
  call3002Button.disabled = true;

  vcall3000Button.disabled = true;
  vcall3001Button.disabled = true;
  vcall3002Button.disabled = true;
  hangupButton.disabled = true;
  dialingOut = true;
  activeUA = "video";
  void playSafe(ringbackAudio);
  currentPeer = uri;
  callPeerSpan.innerHTML = currentPeer;
  callStatusSpan.innerHTML = "正在呼叫";
  videoUser
    .connect()
    .then(() => videoUser.call(uri, { inviteWithoutSdp: false }))
    .catch((error: Error) => {
      dialingOut = false;
      stopAudio(ringbackAudio);
      console.error(`[${videoUser.id}] failed to place video call to 3000`);
      console.error(error);
      alert("Failed to place video call to 3000.\n" + error);
      callStatusSpan.innerHTML = "空闲";
      callPeerSpan.innerHTML = "—";
      currentPeer = undefined;
      activeUA = undefined;
    });
});

vcall3001Button.addEventListener("click", () => {
  const uri = "sip:3001@sip.weiyuai.cn";
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1001Button.disabled = true;
  call1002Button.disabled = true;
  call1003Button.disabled = true;
  call1004Button.disabled = true;
  call1005Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call9200Button.disabled = true;
  call5000Button.disabled = true;
  call3000Button.disabled = true;
  call3001Button.disabled = true;
  call3002Button.disabled = true;

  vcall3000Button.disabled = true;
  vcall3001Button.disabled = true;
  vcall3002Button.disabled = true;
  hangupButton.disabled = true;
  dialingOut = true;
  activeUA = "video";
  void playSafe(ringbackAudio);
  currentPeer = uri;
  callPeerSpan.innerHTML = currentPeer;
  callStatusSpan.innerHTML = "正在呼叫";
  videoUser
    .connect()
    .then(() => videoUser.call(uri, { inviteWithoutSdp: false }))
    .catch((error: Error) => {
      dialingOut = false;
      stopAudio(ringbackAudio);
      console.error(`[${videoUser.id}] failed to place video call to 3001`);
      console.error(error);
      alert("Failed to place video call to 3001.\n" + error);
      callStatusSpan.innerHTML = "空闲";
      callPeerSpan.innerHTML = "—";
      currentPeer = undefined;
      activeUA = undefined;
    });
});

vcall3002Button.addEventListener("click", () => {
  const uri = "sip:3002@sip.weiyuai.cn";
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1001Button.disabled = true;
  call1002Button.disabled = true;
  call1003Button.disabled = true;
  call1004Button.disabled = true;
  call1005Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call9200Button.disabled = true;
  call5000Button.disabled = true;
  call3000Button.disabled = true;
  call3001Button.disabled = true;
  call3002Button.disabled = true;

  vcall3000Button.disabled = true;
  vcall3001Button.disabled = true;
  vcall3002Button.disabled = true;
  hangupButton.disabled = true;
  dialingOut = true;
  activeUA = "video";
  void playSafe(ringbackAudio);
  currentPeer = uri;
  callPeerSpan.innerHTML = currentPeer;
  callStatusSpan.innerHTML = "正在呼叫";
  videoUser
    .connect()
    .then(() => videoUser.call(uri, { inviteWithoutSdp: false }))
    .catch((error: Error) => {
      dialingOut = false;
      stopAudio(ringbackAudio);
      console.error(`[${videoUser.id}] failed to place video call to 3002`);
      console.error(error);
      alert("Failed to place video call to 3002.\n" + error);
      callStatusSpan.innerHTML = "空闲";
      callPeerSpan.innerHTML = "—";
      currentPeer = undefined;
      activeUA = undefined;
    });
});

// Add click listener to call 5000 button (IVR test)
call5000Button.addEventListener("click", () => placeAudioCall("sip:5000@sip.weiyuai.cn"));

// Add click listener to call 3000 button (Conference)
call3000Button.addEventListener("click", () => placeAudioCall("sip:3000@sip.weiyuai.cn"));

// Add click listener to call 3001 button (Conference)
call3001Button.addEventListener("click", () => placeAudioCall("sip:3001@sip.weiyuai.cn"));

// Add click listener to call 3002 button (Conference)
call3002Button.addEventListener("click", () => placeAudioCall("sip:3002@sip.weiyuai.cn"));

// Keypad helper function
const keypadDisabled = (disabled: boolean): void => {
  keypad.forEach((button) => (button.disabled = disabled));
  dtmfSpan.innerHTML = "";
};

// Add change listener to hold checkbox
holdCheckbox.addEventListener("change", () => {
  const ua = activeUA === "video" ? videoUser : simpleUser;
  if (holdCheckbox.checked) {
    ua.hold().catch((error: Error) => {
      holdCheckbox.checked = false;
      console.error(`[${ua.id}] failed to hold call`);
      console.error(error);
      alert("Failed to hold call.\n" + error);
    });
  } else {
    ua.unhold().catch((error: Error) => {
      holdCheckbox.checked = true;
      console.error(`[${ua.id}] failed to unhold call`);
      console.error(error);
      alert("Failed to unhold call.\n" + error);
    });
  }
});

// Hold helper function
const holdCheckboxDisabled = (disabled: boolean): void => {
  holdCheckbox.checked = false;
  holdCheckbox.disabled = disabled;
};

// Add change listener to mute checkbox
muteCheckbox.addEventListener("change", () => {
  const ua = activeUA === "video" ? videoUser : simpleUser;
  if (muteCheckbox.checked) {
    ua.mute();
    if (ua.isMuted() === false) {
      muteCheckbox.checked = false;
      console.error(`[${ua.id}] failed to mute call`);
      alert("Failed to mute call.\n");
    }
  } else {
    ua.unmute();
    if (ua.isMuted() === true) {
      muteCheckbox.checked = true;
      console.error(`[${ua.id}] failed to unmute call`);
      alert("Failed to unmute call.\n");
    }
  }
});

// Mute helper function
const muteCheckboxDisabled = (disabled: boolean): void => {
  muteCheckbox.checked = false;
  muteCheckbox.disabled = disabled;
};

// Enable the connect button
connectButton.disabled = false;

// Auto connect after page load
window.addEventListener("load", () => {
  if (!connectButton.disabled) {
    setTimeout(() => connectButton.click(), 0);
  }
});

// ===== 注册有效期展示：倒计时与到时刻 =====
function startRegCountdown(expiresSeconds: number): void {
  stopRegCountdown();
  const now = Date.now();
  regExpiryAt = now + expiresSeconds * 1000;
  regExpiryTimeSpan.innerHTML = new Date(regExpiryAt).toLocaleString();
  const tick = () => {
    if (!regExpiryAt) return;
    const remainMs = regExpiryAt - Date.now();
    const remainSec = Math.max(0, Math.floor(remainMs / 1000));
    regExpiresSpan.innerHTML = `${remainSec} 秒`;
    if (remainSec <= 0) {
      stopRegCountdown();
    }
  };
  tick();
  regCountdownTimer = setInterval(tick, 1000);
}

function stopRegCountdown(): void {
  if (regCountdownTimer) {
    clearInterval(regCountdownTimer);
    regCountdownTimer = undefined;
  }
  regExpiryAt = undefined;
}
