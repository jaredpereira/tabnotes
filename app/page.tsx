import type { Metadata } from "next";
import { NotesList } from "./NotesLists";

export const metadata: Metadata = { title: "tab notes" };
export default function IndexPage() {
  return (
    <div className="p-2">
      <p>
        a very tiny web page for writing notes in tabs. Made to be useful with
        tree-style tabs.
      </p>
      <NotesList />
    </div>
  );
}
