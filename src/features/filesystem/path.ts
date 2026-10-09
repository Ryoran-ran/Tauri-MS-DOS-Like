export class FileSystemError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileSystemError';
  }
}

export function resolvePath(input: string, currentDirectory = 'C:\\'): string {
  const value = input.trim().replaceAll('/', '\\');
  if (/[\x00-\x1f<>"|?*]/.test(value)) {
    throw new FileSystemError('パスに使用できない文字が含まれています。');
  }
  const driveMatch = /^([a-z]):/i.exec(value);
  if (driveMatch && driveMatch[1]?.toUpperCase() !== 'C') {
    throw new FileSystemError('利用できる仮想ドライブは C: のみです。');
  }
  const withoutDrive = driveMatch ? value.slice(2) : value;
  if (withoutDrive.includes(':')) throw new FileSystemError('パスの形式が正しくありません。');
  // C: is the drive root; drive-relative C:foo is deliberately rejected.
  if (driveMatch && withoutDrive && !withoutDrive.startsWith('\\')) {
    throw new FileSystemError('絶対パスは C:\\ から指定してください。');
  }
  const absolute = Boolean(driveMatch) || withoutDrive.startsWith('\\');
  const parts = absolute ? [] : currentDirectory.slice(3).split('\\').filter(Boolean);
  for (const part of withoutDrive.split('\\')) {
    if (!part || part === '.') continue;
    if (part === '..') parts.pop();
    else parts.push(part.toUpperCase());
  }
  return `C:\\${parts.join('\\')}`;
}
