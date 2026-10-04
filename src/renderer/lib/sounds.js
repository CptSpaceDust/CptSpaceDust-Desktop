import notificationUrl from "../assets/audio/notification.wav";
import ringtoneUrl from "../assets/audio/voice-call-ringtone.mp3";
import joinUrl from "../assets/audio/voice-call-join.mp3";
import leaveUrl from "../assets/audio/voice-call-leave.mp3";
import { getPreferences, isQuietTime } from "./preferences";

let notificationAudio;
let ringtoneAudio;

function audioElement(url, volume, loop = false) {
  const element = new Audio(url);
  element.preload = "auto";
  element.volume = volume;
  element.loop = loop;
  return element;
}

export async function playNotificationSound(options = {}) {
  const settings = getPreferences();
  if (!options.force && (!settings.notificationSound || isQuietTime(settings)))
    return Promise.resolve();
  notificationAudio ||= audioElement(notificationUrl, 0.82);
  notificationAudio.volume = Math.max(
    0,
    Math.min(1, Number(settings.notificationVolume) / 100),
  );
  notificationAudio.pause();
  notificationAudio.currentTime = 0;
  const outputDeviceId = options.outputDeviceId || settings.audioOutputDeviceId;
  if (outputDeviceId && notificationAudio.setSinkId) {
    try {
      await notificationAudio.setSinkId(outputDeviceId);
    } catch {
      /* The selected output may have been disconnected. */
    }
  }
  return notificationAudio.play().catch(() => {});
}

export function startRingtone() {
  ringtoneAudio ||= audioElement(ringtoneUrl, 0.78, true);
  ringtoneAudio.pause();
  ringtoneAudio.currentTime = 0;
  return ringtoneAudio.play().catch(() => {});
}

export function stopRingtone() {
  if (!ringtoneAudio) return;
  ringtoneAudio.pause();
  ringtoneAudio.currentTime = 0;
}

export function playCallEventSound(type) {
  const source = type === "join" ? joinUrl : type === "leave" ? leaveUrl : "";
  if (!source) return Promise.resolve();
  const sound = audioElement(source, 0.8);
  const cleanup = () => {
    sound.removeEventListener("ended", cleanup);
    sound.removeEventListener("error", cleanup);
    sound.src = "";
  };
  sound.addEventListener("ended", cleanup);
  sound.addEventListener("error", cleanup);
  return sound.play().catch(cleanup);
}
