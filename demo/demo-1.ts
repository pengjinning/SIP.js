/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable no-console */
import { SimpleUser, SimpleUserDelegate, SimpleUserOptions } from "../lib/platform/web/index.js";
import { getAudio, getButton, getButtons, getInput, getSpan } from "./demo-utils.js";

const serverSpan = getSpan("server");
const targetSpan = getSpan("target");
const connectButton = getButton("connect");
const callButton = getButton("call");
const call2000Button = getButton("call2000");
const hangupButton = getButton("hangup");
const disconnectButton = getButton("disconnect");
const audioElement = getAudio("remoteAudio");
const keypad = getButtons("keypad");
const dtmfSpan = getSpan("dtmf");
const holdCheckbox = getInput("hold");
const muteCheckbox = getInput("mute");

// WebSocket Server URL
const webSocketServer = "wss://sip.weiyuai.cn/ws";
serverSpan.innerHTML = webSocketServer;

// Demo user AOR and credentials
const aor = "sip:alice@sip.weiyuai.cn";
const AUTH_USER = "alice";
const AUTH_PASS = "bytedesk123";

// Destination URI
const target = "sip:echo@sip.weiyuai.cn";
targetSpan.innerHTML = target;

// Name for demo user
const displayName = "Alice";

// SimpleUser delegate
const simpleUserDelegate: SimpleUserDelegate = {
  onCallCreated: (): void => {
    console.log(`[${displayName}] Call created`);
    callButton.disabled = true;
    call2000Button.disabled = true;
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
  onCallHangup: (): void => {
    console.log(`[${displayName}] Call hangup`);
    callButton.disabled = false;
    call2000Button.disabled = false;
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
  },
  onUnregistered: (): void => {
    console.log(`[${displayName}] Unregistered`);
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
  call2000Button.disabled = true;
  hangupButton.disabled = true;
  simpleUser
    .connect()
    .then(() => simpleUser.register()) // connect 后自动注册
    .then(() => {
      connectButton.disabled = true;
      disconnectButton.disabled = false;
      callButton.disabled = false;
      call2000Button.disabled = false;
      hangupButton.disabled = true;
    })
    .catch((error: Error) => {
      connectButton.disabled = false;
      console.error(`[${simpleUser.id}] failed to connect/register`);
      console.error(error);
      alert("Failed to connect/register.\n" + error);
    });
});

// Add click listener to call button
callButton.addEventListener("click", () => {
  callButton.disabled = true;
  call2000Button.disabled = true;
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

// Add click listener to call 2000 button
call2000Button.addEventListener("click", () => {
  callButton.disabled = true;
  call2000Button.disabled = true;
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
  call2000Button.disabled = true;
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
  Promise.resolve()
    .then(() => simpleUser.unregister().catch(() => undefined)) // 先注销,忽略失败
    .then(() => simpleUser.disconnect())
    .then(() => {
      connectButton.disabled = false;
      disconnectButton.disabled = true;
      callButton.disabled = true;
      call2000Button.disabled = true;
      hangupButton.disabled = true;
    })
    .catch((error: Error) => {
      console.error(`[${simpleUser.id}] failed to disconnect`);
      console.error(error);
      alert("Failed to disconnect.\n" + error);
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
