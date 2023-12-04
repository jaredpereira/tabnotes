import { useCallback, useRef } from "react";

type undoRedoStackItem = {
  undo: { value: string; cursors: number[] };
  redo: { value: string; cursors: number[] };
};
export function FancyTextarea({
  setValue,
  ...propsWithoutSetValue
}: JSX.IntrinsicElements["textarea"] & { setValue: (v: string) => void }) {
  let ref = useRef<HTMLTextAreaElement>(null);
  let undoRedoStack = useRef({
    undo: [] as undoRedoStackItem[],
    redo: [] as undoRedoStackItem[],
  });
  let inputUndoRef = useRef<{
    value: string;
    cursors: number[];
    timeout: number;
  } | null>(null);

  let previousSelection = useRef<null | { start: number; end: number }>();
  let closeInputUndoRef = useCallback((value: string, cursors: number[]) => {
    if (!inputUndoRef.current) return;
    undoRedoStack.current.undo.push({
      undo: {
        value: inputUndoRef.current.value,
        cursors: inputUndoRef.current.cursors,
      },
      redo: { value: value, cursors },
    });
    undoRedoStack.current.redo = [];
    window.clearInterval(inputUndoRef.current.timeout);
    inputUndoRef.current = null;
  }, []);

  let transact = useCallback(
    async (
      value: string,
      initialCursor: number[],
      transaction: Transaction,
      offset: [number, number] | number = [0, 0]
    ) => {
      closeInputUndoRef(value, initialCursor);
      let [newValue, cursors] = modifyString(value, initialCursor, transaction);
      let offsets: [number, number];
      if (typeof offset === "number") offsets = [offset, offset];
      else offsets = offset;
      if (!ref.current) return;
      setValue(newValue);
      let start = cursors[0] + offsets[0];
      let end = cursors[1] + offsets[1];
      undoRedoStack.current.undo.push({
        undo: { value, cursors: initialCursor },
        redo: {
          value: newValue,
          cursors: [start, end],
        },
      });
      undoRedoStack.current.redo = [];
      requestAnimationFrame(() => {
        ref.current?.setSelectionRange(start, end);
      });
      previousSelection.current = { start, end };
    },
    [closeInputUndoRef, setValue]
  );

  let onSelect = useCallback(
    (e: React.SyntheticEvent<HTMLTextAreaElement, Event>) => {
      let start = e.currentTarget.selectionStart,
        end = e.currentTarget.selectionEnd;
      previousSelection.current = { start, end };
    },
    []
  );
  let onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      let value = e.currentTarget.value;
      let start = e.currentTarget.selectionStart,
        end = e.currentTarget.selectionEnd;
      let initialCursor = [start, end];

      let transact = async (
        transaction: Transaction,
        offset: [number, number] | number = [0, 0]
      ) => {
        closeInputUndoRef(value, initialCursor);
        let [newValue, cursors] = modifyString(
          value,
          initialCursor,
          transaction
        );
        let offsets: [number, number];
        if (typeof offset === "number") offsets = [offset, offset];
        else offsets = offset;
        if (!ref.current) return;
        setValue(newValue);
        let start = cursors[0] + offsets[0];
        let end = cursors[1] + offsets[1];
        undoRedoStack.current.undo.push({
          undo: { value, cursors: initialCursor },
          redo: {
            value: newValue,
            cursors: [start, end],
          },
        });
        requestAnimationFrame(() => {
          ref.current?.setSelectionRange(start, end);
        });
        previousSelection.current = { start, end };
      };
      switch (e.key) {
        case "z": {
          if (!(e.ctrlKey || e.metaKey)) break;
          e.preventDefault();
          closeInputUndoRef(value, initialCursor);
          let undo = undoRedoStack.current.undo.pop();
          if (!undo) break;
          undoRedoStack.current.redo.push(undo);
          setValue(undo.undo.value);
          let undoCursors = undo.undo.cursors;
          requestAnimationFrame(() => {
            ref.current?.setSelectionRange(undoCursors[0], undoCursors[1]);
          });
          break;
        }
        case "Z": {
          if (!(e.ctrlKey || e.metaKey)) break;
          e.preventDefault();
          closeInputUndoRef(value, initialCursor);
          let redo = undoRedoStack.current.redo.pop();
          if (!redo) break;
          undoRedoStack.current.undo.push(redo);
          setValue(redo.redo.value);
          let redoCursors = redo.redo.cursors;
          requestAnimationFrame(() => {
            ref.current?.setSelectionRange(redoCursors[0], redoCursors[1]);
          });
        }
        case "Enter": {
          let lineIndex = value.lastIndexOf("\n", start - 1);
          let currentLine = value.slice(0, start).split("\n").pop();
          if (!currentLine) break;
          if (
            currentLine.match(/^(\s*)-\s*$/) ||
            currentLine.match(/^(\s*)(\d+)\.\s*$/)
          ) {
            e.preventDefault();
            let delLength = currentLine.length;
            transact((text) => {
              text.delete(lineIndex + 1, delLength - 1);
            }, -1 * delLength);
            break;
          }
          let numberMatch = currentLine.match(/^(\s*)(\d+)\.\s*/);
          if (numberMatch) {
            let length = numberMatch[1].length;
            let number = parseInt(numberMatch[2]) + 1;
            e.preventDefault();
            transact((text) => {
              text.insert(start, `\n${" ".repeat(length)}${number}. `);
            }, length + number.toString().length + 3);
          }
          const match = currentLine.match(/^(\s*)-/);
          if (match) {
            let length = match[1].length;
            e.preventDefault();
            transact((text) => {
              text.insert(start, `\n${" ".repeat(length)}- `);
            }, length + 3);
          }
          break;
        }
        case "Tab": {
          let lineIndex = value.lastIndexOf("\n", start - 1);
          if (lineIndex === -1) break;
          let currentLine = value.slice(lineIndex + 1, start);
          if (!currentLine) break;
          const match = currentLine.match(/^(\s*)-/);
          if (match) {
            e.preventDefault();
            if (e.shiftKey) {
              if (currentLine[0] === "-") break;
              transact((text) => text.delete(lineIndex + 1, 2), -2);
            } else {
              let previousLine = value
                .slice(0, lineIndex)
                .split("\n")
                .pop()
                ?.match(/^(\s*)/);
              if (!previousLine || previousLine[0].length < match[1].length)
                return;
              transact((text) => text.insert(lineIndex + 1, "  "));
            }
          }

          break;
        }
        case "b": {
          if (!(e.ctrlKey || e.metaKey)) break;
          if (initialCursor[0] !== initialCursor[1]) {
            transact(
              (text) => {
                text.insert(initialCursor[0], "**");
                text.insert(initialCursor[1] + 2, "**");
              },
              [0, 2]
            );
          }
          break;
        }
      }
    },
    [transact, setValue, closeInputUndoRef]
  );

  return (
    <textarea
      ref={ref}
      {...propsWithoutSetValue}
      onSelect={onSelect}
      onKeyDown={onKeyDown}
      onChange={(e) => {
        if (inputUndoRef.current)
          window.clearTimeout(inputUndoRef.current.timeout);
        let value = e.currentTarget.value;
        let start = e.currentTarget.selectionStart,
          end = e.currentTarget.selectionEnd;
        let cursors = [start, end];
        let timeout = window.setTimeout(() => {
          closeInputUndoRef(value, cursors);
        }, 500);

        inputUndoRef.current = {
          value: inputUndoRef.current
            ? inputUndoRef.current.value
            : (value as string),
          cursors: [
            previousSelection.current?.start || 0,
            previousSelection.current?.end || 0,
          ],
          timeout,
        };

        previousSelection.current = { start, end };
        setValue(e.currentTarget.value);
      }}
    />
  );
}

export type Transaction = (tx: {
  insert: (i: number, s: string) => void;
  delete: (i: number, l: number) => void;
}) => void;
export function modifyString(
  input: string,
  initialCursor: number[],
  transact: Transaction
): [string, number[]] {
  let output = input;
  let cursors = initialCursor;
  transact({
    insert: (i: number, s: string) => {
      output = output.slice(0, i) + s + output.slice(i);
      cursors = cursors.map((c) => {
        if (i < c) return c + s.length;
        return c;
      });
    },
    delete: (i: number, l: number) => {
      output = output.slice(0, i) + output.slice(i + l);
      cursors = cursors.map((c) => {
        if (i > c) return c - l;
        return c;
      });
    },
  });
  return [output, cursors];
}
