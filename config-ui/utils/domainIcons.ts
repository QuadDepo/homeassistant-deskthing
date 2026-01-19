import {
  mdiLightbulb,
  mdiToggleSwitch,
  mdiThermometer,
  mdiSpeaker,
  mdiBlindsHorizontal,
  mdiFan,
  mdiLock,
  mdiEye,
} from "@mdi/js";

export const domainIcons: Record<string, string> = {
  light: mdiLightbulb,
  switch: mdiToggleSwitch,
  climate: mdiThermometer,
  media_player: mdiSpeaker,
  cover: mdiBlindsHorizontal,
  fan: mdiFan,
  lock: mdiLock,
  sensor: mdiEye,
  binary_sensor: mdiEye,
};

export const domainLabels: Record<string, string> = {
  light: "Lights",
  switch: "Switches",
  climate: "Climate",
  media_player: "Media",
  cover: "Covers",
  fan: "Fans",
  lock: "Locks",
  sensor: "Sensors",
  binary_sensor: "Binary Sensors",
};

export const defaultIcon = mdiEye;
