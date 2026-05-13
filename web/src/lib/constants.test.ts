import { describe, it, expect } from 'vitest';
import {
  LANGUAGE_NAMES,
  SPEECH_LANGUAGES,
  TAG_CONFIG,
  TAG_FILTERS,
  RECORDING_MODES,
  MODE_FILTERS,
  formatDuration,
  formatRecordingTime,
  formatFullDate,
  formatShortDate,
} from './constants';

describe('LANGUAGE_NAMES', () => {
  it('should contain all 11 supported languages', () => {
    expect(Object.keys(LANGUAGE_NAMES)).toHaveLength(11);
    expect(LANGUAGE_NAMES['zh']).toBe('中文');
    expect(LANGUAGE_NAMES['en']).toBe('English');
    expect(LANGUAGE_NAMES['ar']).toBe('العربية');
  });
});

describe('SPEECH_LANGUAGES', () => {
  it('should have 6 entries with code, label, and flag', () => {
    expect(SPEECH_LANGUAGES).toHaveLength(6);
    SPEECH_LANGUAGES.forEach(lang => {
      expect(lang).toHaveProperty('code');
      expect(lang).toHaveProperty('label');
      expect(lang).toHaveProperty('flag');
    });
  });

  it('first language should be zh-CN', () => {
    expect(SPEECH_LANGUAGES[0].code).toBe('zh-CN');
  });
});

describe('TAG_CONFIG', () => {
  it('should have 5 tag types with label, color, and bgColor', () => {
    const tags = Object.keys(TAG_CONFIG);
    expect(tags).toEqual(['inspiration', 'project', 'personal', 'reading', 'design']);
    tags.forEach(tag => {
      const config = TAG_CONFIG[tag as keyof typeof TAG_CONFIG];
      expect(config.label).toBeTruthy();
      expect(config.color).toMatch(/^var\(--/);
      expect(config.bgColor).toMatch(/^rgba\(/);
    });
  });
});

describe('TAG_FILTERS', () => {
  it('should start with "all" filter', () => {
    expect(TAG_FILTERS[0].id).toBe('all');
    expect(TAG_FILTERS[0].label).toBe('全部');
  });

  it('should have 6 entries (all + 5 tags)', () => {
    expect(TAG_FILTERS).toHaveLength(6);
  });
});

describe('RECORDING_MODES', () => {
  it('should have 5 recording modes', () => {
    expect(RECORDING_MODES).toHaveLength(5);
    const ids = RECORDING_MODES.map(m => m.id);
    expect(ids).toEqual(['thoughts', 'meeting', 'lecture', 'interview', 'journal']);
  });

  it('each mode should have id, label, and sublabel', () => {
    RECORDING_MODES.forEach(mode => {
      expect(mode.id).toBeTruthy();
      expect(mode.label).toBeTruthy();
      expect(mode.sublabel).toBeTruthy();
    });
  });
});

describe('MODE_FILTERS', () => {
  it('should start with "all" filter', () => {
    expect(MODE_FILTERS[0].id).toBe('all');
  });

  it('should have 6 entries (all + 5 modes)', () => {
    expect(MODE_FILTERS).toHaveLength(6);
  });
});

describe('formatDuration', () => {
  it('should format 0 seconds', () => {
    expect(formatDuration(0)).toBe('00:00');
  });

  it('should format 65 seconds as 01:05', () => {
    expect(formatDuration(65)).toBe('01:05');
  });

  it('should format 3600 seconds as 60:00', () => {
    expect(formatDuration(3600)).toBe('60:00');
  });
});

describe('formatRecordingTime', () => {
  it('should format 0 seconds as 00:00:00', () => {
    expect(formatRecordingTime(0)).toBe('00:00:00');
  });

  it('should format 3661 seconds as 01:01:01', () => {
    expect(formatRecordingTime(3661)).toBe('01:01:01');
  });
});

describe('formatFullDate', () => {
  it('should include year, month, day and time', () => {
    const date = new Date('2026-05-13T10:30:00');
    const result = formatFullDate(date);
    expect(result).toContain('2026');
    expect(result).toContain('05');
    expect(result).toContain('13');
  });
});

describe('formatShortDate', () => {
  it('should return a short date string', () => {
    const date = new Date('2026-05-13');
    const result = formatShortDate(date);
    expect(result).toBeTruthy();
    // Should contain month and day in some format
    expect(result.length).toBeLessThan(20);
  });
});
