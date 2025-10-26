export function time_ago(date: Date) {
  const now = new Date().getTime();

  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  const seconds = Math.floor((now - localDate.getTime()) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval === 1) { return interval + " year ago"; }
  if (interval > 1) { return interval + " years ago"; }

  interval = Math.floor(seconds / 2592000);
  if (interval === 1) { return interval + " month ago"; }
  if (interval > 1) { return interval + " months ago"; }

  interval = Math.floor(seconds / 86400);
  if (interval === 1) { return interval + " day ago"; }
  if (interval > 1) { return interval + " days ago"; }

  interval = Math.floor(seconds / 3600);
  if (interval === 1) { return interval + " hour ago"; }
  if (interval > 1) { return interval + " hours ago"; }

  interval = Math.floor(seconds / 60);
  if (interval === 1) { return interval + " minute ago"; }
  if (interval > 1) { return interval + " minutes ago"; }

  if (seconds < 10) return "just now";

  return Math.floor(seconds) + " seconds ago";
};

export function ticks_to_time(ticks: number) {
  let seconds = Math.floor(ticks / 60);
  let minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  const milliseconds = Math.floor((ticks % 60) * 1000 / 60);
  seconds = seconds % 60;
  minutes = minutes % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  } else if (minutes > 0) {
    return `${minutes}:${seconds.toString().padStart(2, "0")}.${milliseconds.toString().padStart(3, "0")}`;
  } else {
    return `${seconds}.${milliseconds.toString().padStart(3, "0")}`;
  }
};