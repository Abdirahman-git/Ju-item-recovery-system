/** Stable 12-hour label (avoids locale showing bare "0" for midnight). */
export const formatItemTime = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';

  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  if (hours === 0) hours = 12;

  return `${hours}:${String(minutes).padStart(2, '0')} ${ampm}`;
};

export const getDefaultTimeLabel = () => formatItemTime(new Date());

const TIME_LABEL_RE = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

export const parseTimeLabelToDate = (timeLabel, dateString) => {
  const match = typeof timeLabel === 'string' && timeLabel.trim().match(TIME_LABEL_RE);
  if (!match) return new Date();

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();

  if (ampm === 'PM' && hours !== 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;

  const parts = (dateString || '').split('-').map((n) => parseInt(n, 10));
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || new Date().getDate();

  return new Date(year, month, day, hours, minutes, 0, 0);
};

export const combineDateAndTime = (dateString, timeDate) => {
  const parts = (dateString || '').split('-').map((n) => parseInt(n, 10));
  const year = parts[0] || new Date().getFullYear();
  const month = (parts[1] || 1) - 1;
  const day = parts[2] || new Date().getDate();

  return new Date(year, month, day, timeDate.getHours(), timeDate.getMinutes(), 0, 0);
};

export const isFutureDateTime = (dateString, timeDate) =>
  combineDateAndTime(dateString, timeDate).getTime() > Date.now();

/** Android fires dismissed events; only commit on explicit set. */
export const shouldCommitPickerValue = (event) => {
  if (!event) return true;
  if (event.type === 'dismissed' || event.type === 'neutralButtonPressed') return false;
  return event.type === 'set' || event.type === undefined;
};

export const readItemTimeField = (item, kind) => {
  if (!item) return null;
  if (kind === 'lost') {
    return item.timeLost ?? item.timelost ?? item.time_lost ?? null;
  }
  return item.timeFound ?? item.timefound ?? item.time_found ?? null;
};
