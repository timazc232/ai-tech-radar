import { differsFromOriginal } from '@/lib/i18n';

export function Bilingual({
  original,
  zh,
  as = 'div',
  className,
  zhClassName,
  compact = false,
}: {
  original: string;
  zh?: string | null;
  as?: 'div' | 'p' | 'span' | 'h1';
  className?: string;
  zhClassName?: string;
  compact?: boolean;
}) {
  const Tag = as;
  const showZh = differsFromOriginal(original, zh);
  return (
    <div className={compact ? '' : 'space-y-1'}>
      <Tag className={className}>{original}</Tag>
      {showZh && (
        <p className={zhClassName ?? 'zh-follow'}>
          <span className="zh-tag">中文</span>
          {zh}
        </p>
      )}
    </div>
  );
}
