import { api, type StorageObject } from '../api';

interface Props {
  branchId: string;
  bucketName: string;
  object: StorageObject;
  pending: string | null;
  onDelete: (branchId: string, bucket: string, key: string) => void;
}

function extensionOf(key: string): string {
  const base = key.split('/').pop() ?? key;
  const dot = base.lastIndexOf('.');
  return dot === -1 ? '' : base.slice(dot + 1).toLowerCase();
}

function isImage(ext: string): boolean {
  return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext);
}

function formatBytes(size: number): string {
  return size < 1024 ? `${size} B` : `${(size / 1024).toFixed(1)} KB`;
}

export function ObjectRow({ branchId, bucketName, object, pending, onDelete }: Props) {
  const ext = extensionOf(object.key) || 'file';
  const url = api.objectUrl(branchId, bucketName, object.key);
  const deleting = pending === `obj:${object.key}`;

  return (
    <div className="obj-row">
      <div className="obj-preview">
        {isImage(ext) ? (
          <img className="thumb" loading="lazy" src={url} alt={object.key} />
        ) : (
          <span className={`file-tile ext-${ext}`}>{ext.toUpperCase()}</span>
        )}
      </div>
      <div className="obj-info">
        <a className="obj-key" href={url} target="_blank" rel="noreferrer">
          {object.key}
        </a>
        <span className="pill">{formatBytes(object.size)}</span>
      </div>
      <button
        className={`btn danger sm${deleting ? ' loading' : ''}`}
        disabled={pending !== null}
        onClick={() => onDelete(branchId, bucketName, object.key)}
      >
        Delete
      </button>
    </div>
  );
}
