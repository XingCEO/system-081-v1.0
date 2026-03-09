// 分類選擇列
export default function CategoryBar({ categories, selected, onSelect }) {
  return (
    <div className="flex gap-2 px-4 py-3 overflow-x-auto bg-pos-card/50 border-b border-pos-accent/20">
      <button
        onClick={() => onSelect(null)}
        className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
          selected === null
            ? 'bg-primary-600 text-white'
            : 'bg-pos-accent/30 text-pos-muted hover:text-pos-text'
        }`}
      >
        全部
      </button>
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
            selected === cat.id
              ? 'text-white'
              : 'bg-pos-accent/30 text-pos-muted hover:text-pos-text'
          }`}
          style={selected === cat.id ? { backgroundColor: cat.color || '#2563eb' } : {}}
        >
          {cat.icon} {cat.name}
        </button>
      ))}
    </div>
  );
}
