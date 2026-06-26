import type { ReactNode } from 'react';
import { Tag } from 'antd';

/** A rounded, filled status chip — the console's pill style for statuses. */
export function StatusPill({ color, children }: { color?: string; children: ReactNode }) {
  return (
    <Tag
      color={color}
      bordered={false}
      style={{ borderRadius: 999, fontWeight: 600, paddingInline: 10, margin: 0 }}
    >
      {children}
    </Tag>
  );
}
