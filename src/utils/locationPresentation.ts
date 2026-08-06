export function getLocationSymbol(id: string, name: string): string {
  const symbols: Record<string, string> = {
    fridge: "🧊",
    freezer: "❄️",
    kitchen: "🍳",
    bathroom: "🫧",
    bedroom: "🛏️",
    living_room: "🛋️",
    storage_box: "📦",
    other: "📍",
  };

  if (symbols[id]) return symbols[id];
  if (name.includes("冷冻") || name.includes("冰柜")) return "❄️";
  if (name.includes("冰箱") || name.includes("冷藏")) return "🧊";
  if (name.includes("厨房") || name.includes("锅")) return "🍳";
  if (name.includes("卫生间") || name.includes("浴室")) return "🫧";
  if (name.includes("卧室") || name.includes("床")) return "🛏️";
  if (name.includes("客厅") || name.includes("沙发")) return "🛋️";
  if (name.includes("书") || name.includes("文件")) return "📚";
  if (name.includes("衣柜") || name.includes("衣橱")) return "👚";
  if (name.includes("鞋柜")) return "👟";
  if (name.includes("柜") || name.includes("抽屉") || name.includes("层")) return "🗄️";
  if (name.includes("箱") || name.includes("盒")) return "📦";
  if (name.includes("桌")) return "🪑";
  return "📍";
}
