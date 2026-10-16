import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { csvParser } from './csvParser';
import { findParserForFile } from './registry';
import { decodeText, tableToTopicRows } from './tableRows';
import { textParser } from './textParser';
import { xlsxParser } from './xlsxParser';

const fileFrom = (content: BlobPart, name: string) => new File([content], name);

describe('tableToTopicRows', () => {
  it('detects English and Turkish headers in any column order', () => {
    expect(tableToTopicRows([['lesson', 'topic'], ['Türkçe', 'Paragraf']])).toEqual([{ lesson: 'Türkçe', topic: 'Paragraf' }]);
    expect(tableToTopicRows([['KONU', 'DERS'], ['Paragraf', 'Türkçe']])).toEqual([{ lesson: 'Türkçe', topic: 'Paragraf' }]);
  });

  it('treats the first row as data when there is no header', () => {
    expect(tableToTopicRows([['Türkçe', 'Paragraf'], ['Tarih', 'Osmanlı']])).toHaveLength(2);
  });

  it('drops empty rows, trims cells and keeps incomplete rows', () => {
    expect(tableToTopicRows([[' Türkçe ', ' Paragraf '], ['', ''], ['Tarih']])).toEqual([
      { lesson: 'Türkçe', topic: 'Paragraf' },
      { lesson: 'Tarih', topic: '' },
    ]);
  });
});

describe('decodeText', () => {
  it('reads UTF-8 with or without BOM', () => {
    const utf8 = new TextEncoder().encode('﻿ders;konu\nTürkçe;Sözcükte Anlam');
    expect(decodeText(utf8.buffer as ArrayBuffer)).toBe('ders;konu\nTürkçe;Sözcükte Anlam');
  });

  it('falls back to Windows-1254 for Turkish Excel CSV exports', () => {
    // "Coğrafya;İklim" in Windows-1254: ğ = 0xF0, İ = 0xDD
    const bytes = new Uint8Array([0x43, 0x6f, 0xf0, 0x72, 0x61, 0x66, 0x79, 0x61, 0x3b, 0xdd, 0x6b, 0x6c, 0x69, 0x6d]);
    expect(decodeText(bytes.buffer)).toBe('Coğrafya;İklim');
  });
});

describe('csvParser', () => {
  it('parses comma CSV with header and quoted values', async () => {
    const csv = 'lesson,topic\nTürkçe,Sözcükte Anlam\nTarih,"Osmanlı Kültür, Medeniyet"\n';
    expect(await csvParser.parse({ kind: 'file', file: fileFrom(csv, 'a.csv') })).toEqual([
      { lesson: 'Türkçe', topic: 'Sözcükte Anlam' },
      { lesson: 'Tarih', topic: 'Osmanlı Kültür, Medeniyet' },
    ]);
  });

  it('auto-detects semicolons (Turkish Excel)', async () => {
    const csv = 'Ders;Konu\r\nCoğrafya;İklim\r\n';
    expect(await csvParser.parse({ kind: 'file', file: fileFrom(csv, 'a.csv') })).toEqual([{ lesson: 'Coğrafya', topic: 'İklim' }]);
  });
});

describe('xlsxParser', () => {
  it('reads the first sheet', async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Ders', 'Konu'], ['Türkçe', 'Paragraf'], [], ['Tarih', 'Kurtuluş Savaşı']]), 'Konular');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['ignored', 'sheet']]), 'Diğer');
    const bytes = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
    expect(await xlsxParser.parse({ kind: 'file', file: fileFrom(bytes, 'a.xlsx') })).toEqual([
      { lesson: 'Türkçe', topic: 'Paragraf' },
      { lesson: 'Tarih', topic: 'Kurtuluş Savaşı' },
    ]);
  });
});

describe('textParser', () => {
  it('puts each non-empty line into the target lesson, stripping bullets but not numbers', async () => {
    const text = '- Sözcükte Anlam\n\n• Cümlede Anlam\r\n1. Dünya Savaşı\n   ';
    expect(await textParser.parse({ kind: 'text', text }, { targetLessonName: 'Türkçe' })).toEqual([
      { lesson: 'Türkçe', topic: 'Sözcükte Anlam' },
      { lesson: 'Türkçe', topic: 'Cümlede Anlam' },
      { lesson: 'Türkçe', topic: '1. Dünya Savaşı' },
    ]);
  });

  it('requires a target lesson', async () => {
    await expect(textParser.parse({ kind: 'text', text: 'x' })).rejects.toThrow();
  });
});

describe('findParserForFile', () => {
  it('matches by extension, case-insensitively', () => {
    expect(findParserForFile('Konular.XLSX')?.id).toBe('xlsx');
    expect(findParserForFile('konular.csv')?.id).toBe('csv');
    expect(findParserForFile('notlar.txt')?.id).toBe('text');
    expect(findParserForFile('resim.png')).toBeUndefined();
  });
});
