import { useRef, useState } from "react";

type GesturePatternInputProps = {
  onComplete: (pattern: string) => void | Promise<void>;
  disabled?: boolean;
};

export function GesturePatternInput({ onComplete, disabled }: GesturePatternInputProps) {
  const [selected, setSelected] = useState<number[]>([]);
  const selectedRef = useRef<number[]>([]);
  const drawingRef = useRef(false);

  function begin(index: number) {
    if (disabled) return;
    drawingRef.current = true;
    selectedRef.current = [index];
    setSelected([index]);
  }

  function add(index: number) {
    if (!drawingRef.current || selectedRef.current.includes(index)) return;
    selectedRef.current = [...selectedRef.current, index];
    setSelected(selectedRef.current);
  }

  async function finish() {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    const pattern = selectedRef.current.join("");
    if (pattern.length >= 4) await onComplete(pattern);
    selectedRef.current = [];
    window.setTimeout(() => setSelected([]), 220);
  }

  return (
    <div
      className="gesture-pattern"
      aria-label="九宫格手势图案"
      onPointerUp={finish}
      onPointerCancel={finish}
      onPointerLeave={finish}
      onPointerMove={(event) => {
        const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>("[data-pattern-index]");
        const index = Number(target?.dataset.patternIndex);
        if (index) add(index);
      }}
    >
      {Array.from({ length: 9 }, (_, index) => index + 1).map((index) => (
        <button
          key={index}
          type="button"
          className={selected.includes(index) ? "is-selected" : ""}
          aria-label={`手势点 ${index}`}
          data-pattern-index={index}
          disabled={disabled}
          onPointerDown={(event) => {
            event.preventDefault();
            begin(index);
          }}
          onPointerEnter={() => add(index)}
          onClick={(event) => {
            if (event.detail !== 0 || drawingRef.current) return;
            if (selectedRef.current.includes(index)) return;
            selectedRef.current = [...selectedRef.current, index];
            setSelected(selectedRef.current);
            if (selectedRef.current.length >= 4) {
              const pattern = selectedRef.current.join("");
              void onComplete(pattern);
              selectedRef.current = [];
              window.setTimeout(() => setSelected([]), 220);
            }
          }}
        >
          <span />
        </button>
      ))}
      <small>{selected.length ? `已连接 ${selected.length} 个点` : "按住并滑过至少 4 个点"}</small>
    </div>
  );
}
