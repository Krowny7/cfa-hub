/**
 * Renders a question prompt.
 *
 * Official mock questions carry their exhibits as tab-separated lines inside
 * the prompt text. HTML collapses tabs, so those tables used to arrive as one
 * unreadable run-on sentence. This splits the prompt into paragraphs and real
 * tables, so the data reads as data.
 */

type Block =
  | { kind: "text"; lines: string[] }
  | { kind: "table"; rows: string[][] };

function parsePrompt(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let rows: string[][] = [];

  const flushParagraph = () => {
    if (paragraph.length) blocks.push({ kind: "text", lines: paragraph });
    paragraph = [];
  };
  const flushTable = () => {
    if (rows.length) blocks.push({ kind: "table", rows });
    rows = [];
  };

  for (const raw of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (raw.includes("\t")) {
      flushParagraph();
      rows.push(raw.split("\t").map((cell) => cell.trim()));
    } else {
      flushTable();
      const line = raw.trim();
      if (line) paragraph.push(line);
      else flushParagraph();
    }
  }
  flushParagraph();
  flushTable();
  return blocks;
}

/** Right-align anything that reads as a figure, so columns line up. */
function isNumeric(cell: string) {
  return /^[(–—−-]?\s*[$€£¥]?\s*[\d][\d\s.,]*\s*[%x×]?\s*\)?$/.test(cell.trim());
}

function Table({ rows, compact }: { rows: string[][]; compact?: boolean }) {
  const width = Math.max(...rows.map((r) => r.length));
  const padded = rows.map((r) => [...r, ...Array(width - r.length).fill("")]);

  // Two columns with a figure on the right is a label/value exhibit, which has
  // no header row. Anything wider is a proper table whose first row labels it.
  const labelValue = width === 2 && padded.every((r) => isNumeric(r[1]) || r[1] === "");
  const header = labelValue ? null : padded[0];
  const body = labelValue ? padded : padded.slice(1);

  const cell = compact ? "px-2 py-1" : "px-3 py-1.5";

  return (
    <div className="my-3 overflow-x-auto">
      <table className="w-full min-w-[18rem] border-collapse text-left">
        {header && (
          <thead>
            <tr className="border-b border-white/15">
              {header.map((h, i) => (
                <th
                  key={i}
                  className={`${cell} align-bottom font-medium text-white/60 ${
                    i > 0 ? "text-right" : ""
                  }`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((row, r) => (
            <tr key={r} className="border-b border-white/[0.06] last:border-0">
              {row.map((c, i) => (
                <td
                  key={i}
                  className={`${cell} ${
                    isNumeric(c) ? "text-right tabular-nums" : ""
                  } ${i === 0 ? "text-white/85" : "text-white"}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function QuestionPrompt({
  text,
  className = "",
  compact = false
}: {
  text: string;
  className?: string;
  compact?: boolean;
}) {
  const blocks = parsePrompt(text ?? "");

  return (
    <div className={className}>
      {blocks.map((block, i) =>
        block.kind === "table" ? (
          <Table key={i} rows={block.rows} compact={compact} />
        ) : (
          <p key={i} className={i > 0 ? "mt-2" : ""}>
            {block.lines.join(" ")}
          </p>
        )
      )}
    </div>
  );
}
