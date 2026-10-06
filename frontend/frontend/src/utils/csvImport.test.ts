import { describe, expect, it } from 'vitest';

import { parseCalendarCsvImport } from './csvImport';

describe('parseCalendarCsvImport', () => {
  it('accepts looser CSV headers and date aliases', () => {
    const csv = [
      'Name,When,Notes',
      'Design review,2026-10-14,Demo with stakeholders',
      'Team sync,10/15/2026,Check blockers',
      '',
    ].join('\n');

    expect(parseCalendarCsvImport(csv)).toEqual([
      {
        title: 'Design review',
        dueDate: '2026-10-14',
        description: 'Demo with stakeholders',
        status: 'TODO',
      },
      {
        title: 'Team sync',
        dueDate: '2026-10-15',
        description: 'Check blockers',
        status: 'TODO',
      },
    ]);
  });

  it('falls back to a minimal no-header structure', () => {
    const csv = [
      'Write sprint recap,2026-10-16',
      'Review goals,10/18/2026',
    ].join('\n');

    expect(parseCalendarCsvImport(csv)).toEqual([
      {
        title: 'Write sprint recap',
        dueDate: '2026-10-16',
        description: '',
        status: 'TODO',
      },
      {
        title: 'Review goals',
        dueDate: '2026-10-18',
        description: '',
        status: 'TODO',
      },
    ]);
  });

  it('handles rehearsal-style weekly rows with date ranges and grouped notes', () => {
    const csv = [
      'LES MISÉRABLES — REHEARSAL CALENDAR',
      'WEEK,DATES,GROUPE SCENES,SOLO / NOTES / ADDITIONAL Rehearsal',
      'W01,"May 25 – May 31, 2026",Prologue,,—',
      'W03,"Jun 08 – Jun 14, 2026",Innkeeper\'s song,"Inkeeper\'s song - solo Thenardier",—',
      'W05,"Jun 22 – Jun 28, 2026",People Song,"I Dreamed A Dream - solo Fantine",—',
    ].join('\n');

    expect(parseCalendarCsvImport(csv)).toEqual([
      {
        title: 'W01 — Prologue',
        dueDate: '2026-05-25',
        description: '',
        status: 'TODO',
      },
      {
        title: 'W03 — Innkeeper\'s song · Inkeeper\'s song - solo Thenardier',
        dueDate: '2026-06-08',
        description: '',
        status: 'TODO',
      },
      {
        title: 'W05 — People Song · I Dreamed A Dream - solo Fantine',
        dueDate: '2026-06-22',
        description: '',
        status: 'TODO',
      },
    ]);
  });
});
