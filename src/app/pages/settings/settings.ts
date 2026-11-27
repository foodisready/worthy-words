import { Component, inject, signal } from '@angular/core';
import { DbService } from '../../data/db.service';
import { localDay } from '../../data/dates';
import { reminderIcs } from '../../data/reminder';
import { SettingsService, type Settings } from '../../data/settings.service';
import { StudyService } from '../../data/study.service';

/** Preferences, the calendar reminder, backups, and about. */
@Component({
  selector: 'app-settings',
  templateUrl: './settings.html',
  styleUrl: './settings.scss',
})
export class SettingsPage {
  protected readonly db = inject(DbService);
  protected readonly service = inject(SettingsService);
  private readonly study = inject(StudyService);
  protected readonly settings = this.service.settings;

  protected readonly backupMessage = signal<{ text: string; error?: boolean } | undefined>(
    undefined,
  );

  protected readonly readingOptions: { value: Settings['reading']; label: string }[] = [
    { value: 'jyutping', label: '粵拼 Jyutping (Cantonese)' },
    { value: 'pinyin', label: '拼音 Pinyin (Mandarin)' },
    { value: 'none', label: '無 None' },
  ];
  protected readonly scriptOptions: { value: Settings['script']; label: string }[] = [
    { value: 'trad', label: '繁體 Traditional' },
    { value: 'simp', label: '简体 Simplified' },
  ];
  protected readonly explanationOptions: { value: Settings['explanation']; label: string }[] = [
    { value: 'cantonese', label: '廣東話 Cantonese' },
    { value: 'standard', label: '書面語 Written Chinese' },
  ];
  protected readonly sizeOptions: { value: Settings['textSize']; label: string }[] = [
    { value: 'normal', label: '標準 Normal' },
    { value: 'large', label: '大 Large' },
    { value: 'larger', label: '特大 Larger' },
  ];

  protected setReminderTime(value: string) {
    if (/^\d{2}:\d{2}$/.test(value)) void this.service.set('reminderTime', value);
  }

  protected downloadReminder() {
    const ics = reminderIcs({ time: this.settings().reminderTime, url: document.baseURI });
    download(new Blob([ics], { type: 'text/calendar' }), 'worthy-words-reminder.ics');
  }

  protected async exportData() {
    this.backupMessage.set(undefined);
    try {
      const backup = await this.study.exportBackup();
      const json = JSON.stringify(backup, null, 2);
      download(new Blob([json], { type: 'application/json' }), `worthy-words-${localDay()}.json`);
      this.backupMessage.set({ text: 'Your data has been downloaded. 已下載。' });
    } catch (error) {
      this.backupMessage.set({ text: `Couldn't export: ${message(error)}`, error: true });
    }
  }

  protected async importData(input: HTMLInputElement) {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    this.backupMessage.set(undefined);
    try {
      const backup = await this.study.importBackup(await file.text());
      await this.service.load();
      this.backupMessage.set({
        text:
          `Imported ${backup.progress.length} learned proverbs, ${backup.study_days.length} study days, ` +
          `${backup.bookmarks.length} bookmarks and ${backup.notes.length} notes. 已匯入。`,
      });
    } catch (error) {
      this.backupMessage.set({ text: `Couldn't import: ${message(error)}`, error: true });
    }
  }
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
