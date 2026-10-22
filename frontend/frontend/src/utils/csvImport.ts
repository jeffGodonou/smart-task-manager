export type CalendarCsvTask = {
  title: string;
  dueDate?: string;
  description?: string;
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE';
};

const monthMap: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

const isPlaceholderValue = (value: string): boolean => {
  const normalized = value.replace(/[\u2012\u2013\u2014]/g, '-').trim();
  return normalized === '' || normalized === '—' || normalized === '-' || normalized === 'N/A' || normalized === 'NA';
};

const normalizeCsvValue = (value: string): string => value.replace(/\r/g, '').trim();

const parseCsvRecords = (rawCsv: string): string[][] => {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let inQuotes = false;

  for (let index = 0; index < rawCsv.length; index += 1) {
    const character = rawCsv[index];

    if (character === '"') {
      if (inQuotes && rawCsv[index + 1] === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (character === ',' && !inQuotes) {
      currentRow.push(normalizeCsvValue(currentCell));
      currentCell = '';
      continue;
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && rawCsv[index + 1] === '\n') {
        index += 1;
      }

      currentRow.push(normalizeCsvValue(currentCell));
      if (currentRow.some((cell) => cell.length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = '';
      continue;
    }

    currentCell += character;
  }

  currentRow.push(normalizeCsvValue(currentCell));
  if (currentRow.some((cell) => cell.length > 0)) {
    rows.push(currentRow);
  }

  return rows;
};

const parseDateValue = (value: string): string | undefined => {
  const trimmed = normalizeCsvValue(value);
  if (!trimmed) return undefined;

  const dashed = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (dashed) {
    const [, year, month, day] = dashed;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const slash = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const [, month, day, yearRaw] = slash;
    const year = yearRaw.length === 2 ? `20${yearRaw}` : yearRaw;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }

  const rangeMatch = trimmed.match(/([A-Za-z]{3,9})\s+(\d{1,2})(?:\s*[-–]\s*[A-Za-z]{3,9}\s+\d{1,2})?,?\s*(\d{4})?/i);
  if (rangeMatch) {
    const monthName = rangeMatch[1].toLowerCase();
    const day = Number(rangeMatch[2]);
    const year = rangeMatch[3] ? rangeMatch[3] : new Date().getFullYear();
    const month = monthMap[monthName];

    if (Number.isInteger(month) && Number.isInteger(day)) {
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    }
  }

  const naturalDate = new Date(trimmed);
  if (!Number.isNaN(naturalDate.getTime())) {
    const year = naturalDate.getFullYear();
    const month = `${naturalDate.getMonth() + 1}`.padStart(2, '0');
    const day = `${naturalDate.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return undefined;
};

const normalizeStatus = (value: string | undefined): 'TODO' | 'IN_PROGRESS' | 'DONE' => {
  const normalized = value?.trim().toUpperCase() ?? 'TODO';

  if (normalized === 'DONE' || normalized === 'COMPLETED' || normalized === 'FINISHED') return 'DONE';
  if (normalized === 'IN_PROGRESS' || normalized === 'INPROGRESS' || normalized === 'WORKING') return 'IN_PROGRESS';
  return 'TODO';
};

const hasWeekLikeRow = (row: string[]): boolean => {
  const first = row[0]?.trim() ?? '';
  return /^W\d+$/i.test(first) || /^WEEK\s*\d*$/i.test(first) || /^W\d+\s*[-–]\s*.*$/i.test(first);
};

const isCalendarHeaderText = (value: string): boolean => {
  const normalized = normalizeCsvValue(value).toLowerCase();
  return normalized === 'week' || normalized === 'dates' || normalized === 'groupe scenes' || normalized === 'group scenes' || normalized === 'solo' || normalized === 'notes' || normalized === 'additional rehearsal' || normalized === 'title' || normalized === 'when' || normalized === 'date' || normalized === 'description';
};

const getNormalizedDetailParts = (row: string[]): string[] => {
  return row
    .slice(1)
    .map((cell) => normalizeCsvValue(cell).replace(/\s+/g, ' '))
    .filter((cell) => cell.length > 0 && !isPlaceholderValue(cell) && !parseDateValue(cell))
    .filter((cell) => !/^W\d+$/i.test(cell) && !/^WEEK\s*\d*$/i.test(cell));
};

const buildTask = (title: string, dueDate: string, description: string, status: string): CalendarCsvTask | null => {
  const cleanTitle = title.trim();
  if (!cleanTitle) return null;

  return {
    title: cleanTitle,
    dueDate: dueDate || undefined,
    description: description.trim(),
    status: normalizeStatus(status),
  };
};

export function parseCalendarCsvImport(rawCsv: string): CalendarCsvTask[] {
  if (!rawCsv || !rawCsv.trim()) return [];

  const rows = parseCsvRecords(rawCsv).filter((row) => row.some((cell) => cell.trim().length > 0));
  if (rows.length === 0) return [];

  const weekRows = rows.filter(
    (row) => hasWeekLikeRow(row) && row.slice(1).some((cell) => !!parseDateValue(cell)) && !isCalendarHeaderText(row[0] ?? '')
  );

  if (weekRows.length > 0) {
    return weekRows
      .map((row) => {
        const weekLabel = normalizeCsvValue(row[0]);
        const dateCell = row.slice(1).find((cell) => !!parseDateValue(cell)) ?? row[1] ?? '';
        const dueDate = parseDateValue(dateCell) ?? '';
        const detailParts = getNormalizedDetailParts(row)
          .map((cell) => cell.replace(/^\s*[:;-]\s*/, '').trim())
          .filter((cell) => cell.length > 0);

        const title = detailParts.length > 0 ? `${weekLabel} — ${detailParts.join(' · ')}` : weekLabel;

        return buildTask(title, dueDate, '', 'TODO');
      })
      .filter((task): task is CalendarCsvTask => task !== null);
  }

  const firstRow = rows[0].map((cell) => normalizeCsvValue(cell));
  const hasHeaders = firstRow.some((cell) => /title|date|when|week|task|name|notes|description/i.test(cell));

  if (hasHeaders) {
    return rows.slice(1)
      .map((row) => {
        const titleIndex = row.findIndex((cell) => cell.trim().length > 0 && !isCalendarHeaderText(cell) && !parseDateValue(cell) && !/^status$/i.test(cell));
        const dateIndex = row.findIndex((cell) => !!parseDateValue(cell));
        const titleCell = titleIndex >= 0 ? row[titleIndex] : row[0] ?? '';
        const description = row
          .filter((cell, index) => cell.trim().length > 0 && index !== titleIndex && index !== dateIndex)
          .filter((cell) => !isCalendarHeaderText(cell))
          .filter((cell) => !/^status$/i.test(cell))
          .join(' | ');

        return buildTask(titleCell || row[0] || '', parseDateValue(row[dateIndex] ?? '') ?? '', description, 'TODO');
      })
      .filter((task): task is CalendarCsvTask => task !== null);
  }

  return rows
    .map((row) => {
      const titleValue = row[0] || '';
      const dateValue = row.slice(1).find((cell) => !!parseDateValue(cell)) ?? '';
      const descriptionValue = row
        .slice(1)
        .filter((cell) => cell.trim().length > 0)
        .filter((cell) => !parseDateValue(cell))
        .join(' | ');

      return buildTask(titleValue, parseDateValue(dateValue) ?? '', descriptionValue, 'TODO');
    })
    .filter((task): task is CalendarCsvTask => task !== null);
}
