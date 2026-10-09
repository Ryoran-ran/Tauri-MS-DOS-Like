import { ArrowDownToLine, X } from 'lucide-react';
import type { CommandDefinition } from '../../features/commands/types';

interface Props { command: CommandDefinition; onInsert: (value: string) => void; onClose: () => void }

export function CommandDetails({ command, onInsert, onClose }: Props) {
  const insertion = command.name === 'RUN' ? 'RUN GUESS' : `${command.name}${command.arguments.length ? ' ' : ''}`;
  return (
    <section className="command-details" aria-label={`${command.name}の詳細`}>
      <div className="command-detail-content">
      <div className="detail-heading"><span className="eyebrow">COMMAND GUIDE</span><button className="icon-button small" aria-label="コマンド詳細を閉じる" onClick={onClose}><X size={15} /></button></div>
      <h3>{command.name}<span>{command.displayName}</span></h3>
      <p>{command.description}</p>
      <span className="detail-label">使用方法</span><code className="usage-code">{command.usage}</code>
      <span className="detail-label">使用例</span>
      <div className="example-list">{command.examples.map(example => <code key={example}>{example}</code>)}</div>
      {command.arguments.length > 0 && <dl className="argument-list">{command.arguments.map(argument => <div key={argument.name}><dt>{argument.name}<span>{argument.required ? '必須' : '任意'}</span></dt><dd>{argument.description}</dd></div>)}</dl>}
      </div>
      <div className="command-details-actions"><button className="button primary insert-button" onClick={() => onInsert(insertion)}><ArrowDownToLine size={15} />入力欄に挿入</button></div>
    </section>
  );
}
