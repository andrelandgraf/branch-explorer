import type { TreeNode } from '../tree';

interface Props {
  forest: TreeNode[];
  selectedId: string;
  trunkId: string;
  pending: string | null;
  onSelect: (branchId: string) => void;
  onFork: (parent: string) => void;
  onKill: (branchId: string) => void;
}

function shortId(id: string): string {
  return id.startsWith('br-') ? id.slice(3) : id;
}

function Node({ node, selectedId, trunkId, pending, onSelect, onFork, onKill }: Props & { node: TreeNode }) {
  const { branch } = node;
  const isTrunk = branch.isDefault || branch.id === trunkId;
  const isActive = branch.id === selectedId;
  const killDisabled = isTrunk || node.children.length > 0;
  const forking = pending === `fork:${branch.id}`;
  const killing = pending === `kill:${branch.id}`;

  return (
    <li>
      <div className={`node${isTrunk ? ' trunk' : ''}${isActive ? ' active' : ''}`}>
        <span className="swatch" />
        <div className="meta" style={{ cursor: 'pointer' }} onClick={() => onSelect(branch.id)}>
          <span className="name">
            {branch.name}
            {isTrunk ? <span className="badge trunk">trunk</span> : null}
          </span>
          <span className="sub">{shortId(branch.id)}</span>
        </div>
        <div className="actions">
          <button
            className={`btn green${forking ? ' loading' : ''}`}
            disabled={pending !== null}
            onClick={() => onFork(branch.id)}
          >
            Fork
          </button>
          <button
            className={`btn danger${killing ? ' loading' : ''}`}
            disabled={killDisabled || pending !== null}
            title={
              killDisabled
                ? 'Trunk and branches with children cannot be killed'
                : 'Delete this branch'
            }
            onClick={() => onKill(branch.id)}
          >
            Kill
          </button>
        </div>
      </div>
      {node.children.length > 0 ? (
        <ul>
          {node.children.map((child) => (
            <Node
              key={child.branch.id}
              node={child}
              forest={[]}
              selectedId={selectedId}
              trunkId={trunkId}
              pending={pending}
              onSelect={onSelect}
              onFork={onFork}
              onKill={onKill}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function BranchTree(props: Props) {
  return (
    <ul className="tree">
      {props.forest.map((node) => (
        <Node key={node.branch.id} node={node} {...props} />
      ))}
    </ul>
  );
}
