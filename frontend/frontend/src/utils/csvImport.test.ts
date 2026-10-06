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
});
