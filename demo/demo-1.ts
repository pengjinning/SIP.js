/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
import { SimpleUser, SimpleUserDelegate, SimpleUserOptions } from "../lib/platform/web/index.js";
import { name as sipName, version as sipVersion } from "../lib/index.js";
import { getAudio, getButton, getButtons, getInput, getSpan } from "./demo-utils.js";
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
const connectButton = getButton("connect");
const callButton = getButton("call");
const call1000Button = getButton("call1000");
const call1002Button = getButton("call1002");
const callCustomButton = getButton("callCustom");
const customNumberInput = getInput("customNumber");
const call2000Button = getButton("call2000");
const call5000Button = getButton("call5000");
const hangupButton = getButton("hangup");
const disconnectButton = getButton("disconnect");
const audioElement = getAudio("remoteAudio");
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

// SimpleUser delegate
const simpleUserDelegate: SimpleUserDelegate = {
  onCallCreated: (): void => {
    console.log(`[${displayName}] Call created`);
    callButton.disabled = true;
    call1000Button.disabled = true;
    call1002Button.disabled = true;
    callCustomButton.disabled = true;
    customNumberInput.disabled = true;
    call2000Button.disabled = true;
    call5000Button.disabled = true;
    hangupButton.disabled = false;
    keypadDisabled(true);
    holdCheckboxDisabled(true);
    muteCheckboxDisabled(true);
  },
  onCallAnswered: (): void => {
    console.log(`[${displayName}] Call answered`);
    keypadDisabled(false);
    holdCheckboxDisabled(false);
    muteCheckboxDisabled(false);
  },
  onCallReceived: (): void => {
    console.log(`[${displayName}] Incoming call received`);
    showIncomingModal();
  },
  onCallHangup: (): void => {
    console.log(`[${displayName}] Call hangup`);
    hideIncomingModal();
    callButton.disabled = false;
    call1000Button.disabled = false;
    call1002Button.disabled = false;
    callCustomButton.disabled = false;
    customNumberInput.disabled = false;
    call2000Button.disabled = false;
    call5000Button.disabled = false;
    hangupButton.disabled = true;
    keypadDisabled(true);
    holdCheckboxDisabled(true);
    muteCheckboxDisabled(true);
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
  }
};

// SimpleUser options
const simpleUserOptions: SimpleUserOptions = {
  delegate: simpleUserDelegate,
  aor,
  media: {
    remote: {
      audio: audioElement
    }
  },
  userAgentOptions: {
    logLevel: "debug",
    displayName,
    authorizationUsername: AUTH_USER,
    authorizationPassword: AUTH_PASS
  }
};

// SimpleUser construction
const simpleUser = new SimpleUser(webSocketServer, simpleUserOptions);

// Add click listener to connect button
connectButton.addEventListener("click", () => {
  connectButton.disabled = true;
  disconnectButton.disabled = true;
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1002Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call2000Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser
    .connect()
    .then(() => {
      userStatusSpan.innerHTML = "已连接";
      return simpleUser.register({
        requestDelegate: {
          onAccept: (response: any): void => {
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
                regExpiresSpan.innerHTML = `${expires} 秒`;
                const expiryDate = new Date(Date.now() + expires * 1000);
                regExpiryTimeSpan.innerHTML = expiryDate.toLocaleString();
              } else {
                regExpiresSpan.innerHTML = "未知";
                regExpiryTimeSpan.innerHTML = "—";
              }
            } catch (e) {
              console.warn("解析 REGISTER 响应失败:", e);
              regExpiresSpan.innerHTML = "—";
              regExpiryTimeSpan.innerHTML = "—";
            }
          }
        }
      });
    }) // connect 后自动注册
    .then(() => {
      connectButton.disabled = true;
      disconnectButton.disabled = false;
      callButton.disabled = false;
      call1000Button.disabled = false;
      call1002Button.disabled = false;
      callCustomButton.disabled = false;
      customNumberInput.disabled = false;
      call2000Button.disabled = false;
      call5000Button.disabled = false;
      hangupButton.disabled = true;
      userStatusSpan.innerHTML = "已注册";
    })
    .catch((error: Error) => {
      connectButton.disabled = false;
      console.error(`[${simpleUser.id}] failed to connect/register`);
      console.error(error);
      alert("Failed to connect/register.\n" + error);
      userStatusSpan.innerHTML = "未连接";
    });
});

// Incoming modal button handlers
incomingAccept.addEventListener("click", () => {
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
callButton.addEventListener("click", () => {
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1002Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call2000Button.disabled = true;
  call5000Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser
    .call(target, {
      inviteWithoutSdp: false
    })
    .catch((error: Error) => {
      console.error(`[${simpleUser.id}] failed to place call`);
      console.error(error);
      alert("Failed to place call.\n" + error);
    });
});

// Add click listener to call 1000 button
call1000Button.addEventListener("click", () => {
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1002Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call2000Button.disabled = true;
  call5000Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser
    .call("sip:1000@sip.weiyuai.cn", {
      inviteWithoutSdp: false
    })
    .catch((error: Error) => {
      console.error(`[${simpleUser.id}] failed to place call to 1000`);
      console.error(error);
      alert("Failed to place call to 1000.\n" + error);
    });
});

// Add click listener to call 1002 button
call1002Button.addEventListener("click", () => {
  callButton.disabled = true;
  call1000Button.disabled = true;
  call1002Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  call2000Button.disabled = true;
  call5000Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser
    .call("sip:1002@sip.weiyuai.cn", {
      inviteWithoutSdp: false
    })
    .catch((error: Error) => {
      console.error(`[${simpleUser.id}] failed to place call to 1002`);
      console.error(error);
      alert("Failed to place call to 1002.\n" + error);
    });
});

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
  call2000Button.disabled = true;
  call5000Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser
    .call(targetUri, { inviteWithoutSdp: false })
    .catch((error: Error) => {
      console.error(`[${simpleUser.id}] failed to place call to ${targetUri}`);
      console.error(error);
      alert(`Failed to place call to ${targetUri}.\n` + error);
    });
});

// Add click listener to call 2000 button
call2000Button.addEventListener("click", () => {
  callButton.disabled = true;
  call1000Button.disabled = true;
  call2000Button.disabled = true;
  call5000Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser
    .call("sip:2000@sip.weiyuai.cn", {
      inviteWithoutSdp: false
    })
    .catch((error: Error) => {
      console.error(`[${simpleUser.id}] failed to place call to 2000`);
      console.error(error);
      alert("Failed to place call to 2000.\n" + error);
    });
});

// Add click listener to hangup button
hangupButton.addEventListener("click", () => {
  callButton.disabled = true;
  call1000Button.disabled = true;
  call2000Button.disabled = true;
  call5000Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser.hangup().catch((error: Error) => {
    console.error(`[${simpleUser.id}] failed to hangup call`);
    console.error(error);
    alert("Failed to hangup call.\n" + error);
  });
});

// Add click listener to disconnect button
disconnectButton.addEventListener("click", () => {
  connectButton.disabled = true;
  disconnectButton.disabled = true;
  callButton.disabled = true;
  call2000Button.disabled = true;
  hangupButton.disabled = true;
  call1000Button.disabled = true;
  call1002Button.disabled = true;
  callCustomButton.disabled = true;
  customNumberInput.disabled = true;
  Promise.resolve()
    .then(() => simpleUser.unregister().catch(() => undefined)) // 先注销,忽略失败
    .then(() => simpleUser.disconnect())
    .then(() => {
      connectButton.disabled = false;
      disconnectButton.disabled = true;
      callButton.disabled = true;
      call1000Button.disabled = true;
      call1002Button.disabled = true;
      callCustomButton.disabled = true;
      customNumberInput.disabled = true;
      call2000Button.disabled = true;
      call5000Button.disabled = true;
      hangupButton.disabled = true;
      userStatusSpan.innerHTML = "未连接";
      regExpiresSpan.innerHTML = "—";
      regExpiryTimeSpan.innerHTML = "—";
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
      simpleUser.sendDTMF(tone).then(() => {
        dtmfSpan.innerHTML += tone;
      });
    }
  });
});

// Add click listener to call 5000 button (IVR test)
call5000Button.addEventListener("click", () => {
  callButton.disabled = true;
  call2000Button.disabled = true;
  call5000Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser
    .call("sip:5000@sip.weiyuai.cn", {
      inviteWithoutSdp: false
    })
    .catch((error: Error) => {
      console.error(`[${simpleUser.id}] failed to place call to 5000`);
      console.error(error);
      alert("Failed to place call to 5000.\n" + error);
    });
});

// Keypad helper function
const keypadDisabled = (disabled: boolean): void => {
  keypad.forEach((button) => (button.disabled = disabled));
  dtmfSpan.innerHTML = "";
};

// Add change listener to hold checkbox
holdCheckbox.addEventListener("change", () => {
  if (holdCheckbox.checked) {
    simpleUser.hold().catch((error: Error) => {
      holdCheckbox.checked = false;
      console.error(`[${simpleUser.id}] failed to hold call`);
      console.error(error);
      alert("Failed to hold call.\n" + error);
    });
  } else {
    simpleUser.unhold().catch((error: Error) => {
      holdCheckbox.checked = true;
      console.error(`[${simpleUser.id}] failed to unhold call`);
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
  if (muteCheckbox.checked) {
    simpleUser.mute();
    if (simpleUser.isMuted() === false) {
      muteCheckbox.checked = false;
      console.error(`[${simpleUser.id}] failed to mute call`);
      alert("Failed to mute call.\n");
    }
  } else {
    simpleUser.unmute();
    if (simpleUser.isMuted() === true) {
      muteCheckbox.checked = true;
      console.error(`[${simpleUser.id}] failed to unmute call`);
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
  // Reuse existing click handler to keep UI state changes consistent
  if (!connectButton.disabled) {
    // Slight delay to ensure elements are ready
    setTimeout(() => connectButton.click(), 0);
  }
});
