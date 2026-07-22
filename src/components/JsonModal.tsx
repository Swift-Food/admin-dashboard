import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export interface JsonViewControl {
  version: number;
  mode: 'expand-all' | 'reset';
}

export function JsonView({
  value,
  name,
  depth = 0,
  defaultOpenDepth = 1,
  control,
}: {
  value: unknown;
  name?: string | number;
  depth?: number;
  defaultOpenDepth?: number;
  control?: JsonViewControl;
}) {
  const isObj = value !== null && typeof value === 'object';
  const isArr = Array.isArray(value);
  const [open, setOpen] = useState(depth <= defaultOpenDepth);

  useEffect(() => {
    if (!control) return;
    if (control.mode === 'expand-all') setOpen(true);
    else setOpen(depth <= defaultOpenDepth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [control?.version]);

  const labelEl =
    name !== undefined ? (
      <span className="text-purple-700">
        {typeof name === 'number' ? name : `"${name}"`}:{' '}
      </span>
    ) : null;

  if (!isObj) {
    let cls = 'text-gray-700';
    let text: string;
    if (value === null) { cls = 'text-gray-400'; text = 'null'; }
    else if (typeof value === 'string') { cls = 'text-green-700'; text = `"${value}"`; }
    else if (typeof value === 'number') { cls = 'text-blue-700'; text = String(value); }
    else if (typeof value === 'boolean') { cls = 'text-orange-700'; text = String(value); }
    else { text = String(value); }
    return (
      <div className="break-words">
        {labelEl}
        <span className={cls}>{text}</span>
      </div>
    );
  }

  const entries: Array<[string | number, unknown]> = isArr
    ? (value as unknown[]).map((v, i) => [i, v])
    : Object.entries(value as Record<string, unknown>);

  if (entries.length === 0) {
    return (
      <div>
        {labelEl}
        <span className="text-gray-400">{isArr ? '[ ]' : '{ }'}</span>
      </div>
    );
  }

  const summary = isArr
    ? `Array(${entries.length})`
    : `{${entries.length} ${entries.length === 1 ? 'key' : 'keys'}}`;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-left hover:bg-gray-100 rounded px-0.5"
      >
        <span className="text-gray-400 inline-block w-3">{open ? '▼' : '▶'}</span>{' '}
        {labelEl}
        {open ? (
          <span className="text-gray-500">{isArr ? '[' : '{'}</span>
        ) : (
          <span className="text-gray-500">
            {isArr ? '[' : '{'}{' '}
            <span className="text-gray-400 italic">{summary}</span>{' '}
            {isArr ? ']' : '}'}
          </span>
        )}
      </button>
      {open ? <>
          <div className="pl-4 border-l border-gray-200 ml-1.5">
            {entries.map(([k, v]) => (
              <JsonView
                key={String(k)}
                name={isArr ? (k as number) : (k as string)}
                value={v}
                depth={depth + 1}
                defaultOpenDepth={defaultOpenDepth}
                control={control}
              />
            ))}
          </div>
          <div className="text-gray-500 pl-4">{isArr ? ']' : '}'}</div>
        </> : null}
    </div>
  );
}

export function JsonModal({
  title,
  value,
  onClose,
  extras,
}: {
  title: string;
  value: unknown;
  onClose: () => void;
  extras?: ReactNode;
}) {
  const [copied, setCopied] = useState(false);
  const [control, setControl] = useState<JsonViewControl>({ version: 0, mode: 'reset' });

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handler);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const handleCopy = () => {
    try {
      const text = JSON.stringify(value, null, 2);
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      });
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="fixed inset-0 z-[1100] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-800">{title}</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setControl((c) => ({ version: c.version + 1, mode: 'expand-all' }))}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Expand all
            </button>
            <button
              onClick={() => setControl((c) => ({ version: c.version + 1, mode: 'reset' }))}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              Collapse all
            </button>
            <button
              onClick={handleCopy}
              className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
            >
              {copied ? 'Copied!' : 'Copy JSON'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        {extras ? <div className="px-5 py-2 border-b border-gray-100 bg-gray-50">{extras}</div> : null}
        <div className="overflow-auto p-5 flex-1 font-mono text-xs leading-relaxed">
          <JsonView value={value} defaultOpenDepth={2} control={control} />
        </div>
      </div>
    </div>
  );
}
