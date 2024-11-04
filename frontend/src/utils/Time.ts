export function time_ago(date: any) {
  const now = new Date().getTime();
  
  const localDate = new Date(date.getTime() - (date.getTimezoneOffset() * 60000));
  const seconds = Math.floor((now - localDate.getTime()) / 1000);    

  let interval = Math.floor(seconds / 31536000);
  if (interval === 1) {return interval + ' year ago';}
  if (interval > 1) {return interval + ' years ago';}

  interval = Math.floor(seconds / 2592000);
  if (interval === 1) {return interval + ' month ago';}
  if (interval > 1) {return interval + ' months ago';}

  interval = Math.floor(seconds / 86400);
  if (interval === 1) {return interval + ' day ago';}
  if (interval > 1) {return interval + ' days ago';}

  interval = Math.floor(seconds / 3600);
  if (interval === 1) {return interval + ' hour ago';}
  if (interval > 1) {return interval + ' hours ago';}

  interval = Math.floor(seconds / 60);
  if (interval === 1) {return interval + ' minute ago';}
  if (interval > 1) {return interval + ' minutes ago';}

  if(seconds < 10) return 'just now';

  return Math.floor(seconds) + ' seconds ago';
};

export function ticks_to_time(ticks: number) {
  let seconds = Math.floor(ticks / 60)
  let minutes = Math.floor(seconds / 60)
  let hours = Math.floor(minutes / 60)

  let milliseconds = Math.floor((ticks % 60) * 1000 / 60)
  seconds = seconds % 60;
  minutes = minutes % 60;

  return `${hours === 0 ? "" : hours + ":"}${minutes === 0 ? "" : hours > 0 ? minutes.toString().padStart(2, '0') + ":" : (minutes + ":")}${minutes > 0 ? seconds.toString().padStart(2, '0') : seconds}.${milliseconds.toString().padStart(3, '0')}`;
};