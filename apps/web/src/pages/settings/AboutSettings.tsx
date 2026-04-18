import { useRef, useState } from 'react';
import { api } from '../../api/client.js';
import { useQueryClient } from '@tanstack/react-query';

const VERSION = '1.0.0';

export default function AboutSettings() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported: Record<string, number>; errors: string[] } | null>(null);
  const [error, setError] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const qc = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    setSelectedFile(f);
    setResult(null);
    setError('');
  };

  const [clearFirst, setClearFirst] = useState(false);

  const handleImport = async () => {
    if (!selectedFile) return;
    setImporting(true);
    setError('');
    setResult(null);
    try {
      const res = await api.import.flame(selectedFile, clearFirst);
      setResult(res);
      qc.invalidateQueries({ queryKey: ['apps'] });
      qc.invalidateQueries({ queryKey: ['categories'] });
      qc.invalidateQueries({ queryKey: ['bookmarks'] });
      qc.invalidateQueries({ queryKey: ['themes'] });
      qc.invalidateQueries({ queryKey: ['settings'] });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-10">
      {/* About */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)] mb-4">About</h2>
        <dl className="space-y-2 text-sm">
          {[
            ['Version', VERSION],
            ['Data directory', '/data'],
            ['Database', '/data/flame.db'],
            ['Uploads', '/data/uploads/'],
          ].map(([label, val]) => (
            <div key={label} className="flex gap-6">
              <dt className="text-[var(--color-text-secondary)] w-32 shrink-0">{label}</dt>
              <dd className="font-mono text-xs text-[var(--color-text-primary)]">{val}</dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Import */}
      <section>
        <h2 className="text-xs font-black uppercase tracking-widest text-[var(--color-accent)] mb-2">Import from Flame</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Zip your old Flame <code className="text-xs text-[var(--color-accent)] font-mono">data/</code> folder and upload it here.
          Apps, bookmarks, categories, themes and uploaded icons will be imported.
        </p>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => fileRef.current?.click()}
            className="flame-btn"
          >
            {selectedFile ? selectedFile.name : 'Choose ZIP file'}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".zip,application/zip"
            className="hidden"
            onChange={handleFileChange}
          />
          {selectedFile && (
            <>
              <label className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={clearFirst}
                  onChange={e => setClearFirst(e.target.checked)}
                  className="accent-[var(--color-accent)]"
                />
                导入前清空现有数据
              </label>
              <button
                onClick={handleImport}
                disabled={importing}
                className="flame-btn disabled:opacity-50"
              >
                {importing ? 'Importing…' : 'Start Import'}
              </button>
            </>
          )}
        </div>

        {error && (
          <p className="mt-3 text-sm text-[var(--color-danger)]">{error}</p>
        )}

        {result && (
          <div className="mt-4 space-y-2">
            <p className="text-sm font-medium text-[var(--color-text-primary)]">Import complete</p>
            <dl className="text-sm space-y-1">
              {Object.entries(result.imported).map(([k, v]) => (
                <div key={k} className="flex gap-4">
                  <dt className="text-[var(--color-text-secondary)] capitalize w-24">{k}</dt>
                  <dd className="text-[var(--color-accent)] font-mono">{v}</dd>
                </div>
              ))}
            </dl>
            {result.errors.length > 0 && (
              <details className="mt-2">
                <summary className="text-xs text-[var(--color-text-secondary)] cursor-pointer">
                  {result.errors.length} warning{result.errors.length > 1 ? 's' : ''}
                </summary>
                <ul className="mt-1 text-xs text-[var(--color-danger)] space-y-0.5 max-h-40 overflow-y-auto font-mono">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              </details>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
