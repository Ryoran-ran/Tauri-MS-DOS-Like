import { ArrowDownToLine, ArrowLeft, Play } from 'lucide-react';
import type { CommandDefinition } from '../../features/commands/types';

interface Props { command: CommandDefinition; onInsert: (value: string) => void; onExecute: (value: string) => void; onClose: () => void }

export function CommandDetails({ command, onInsert, onExecute, onClose }: Props) {
  const insertion = command.name === 'RUN' ? 'RUN GUESS' : `${command.name}${command.arguments.length ? ' ' : ''}`;
  const executesDirectly = command.arguments.length === 0;
  return (
    <section className="command-details" aria-label={`${command.name}の詳細`}>
      <div className="command-detail-content">
      <div className="detail-heading"><button className="detail-back-button" type="button" onClick={onClose}><ArrowLeft size={14} />コマンド一覧へ</button></div>
      <h3>{command.name}<span>{command.displayName}</span></h3>
      <p>{command.description}</p>
      <span className="detail-label">使用方法</span><code className="usage-code">{command.usage}</code>
      <span className="detail-label">使用例</span>
      <div className="example-list">{command.examples.map(example => <code key={example}>{example}</code>)}</div>
      {command.arguments.length > 0 && <dl className="argument-list">{command.arguments.map(argument => <div key={argument.name}><dt>{argument.name}<span>{argument.required ? '必須' : '任意'}</span></dt><dd>{argument.description}</dd></div>)}</dl>}
      </div>
      <div className="command-details-actions">{executesDirectly
        ? <button className="button primary insert-button" onClick={() => onExecute(command.name)}><Play size={15} />実行する</button>
        : <button className="button primary insert-button" onClick={() => onInsert(insertion)}><ArrowDownToLine size={15} />入力欄に挿入</button>}
      </div>
    </section>
  );
}
