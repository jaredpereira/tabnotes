"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

export function NotesList() {
  let [notes, setNotes] = useState([] as string[]);
  useEffect(() => {
    let channel = new BroadcastChannel("notes-list");
    channel.onmessage = () => {
      setNotes(getKeys());
    };
    return () => {
      channel.close();
    };
  }, [setNotes]);
  useEffect(() => {
    setNotes(getKeys());
  }, []);
  return (
    <ul>
      {notes.map((note, index) => (
        <li key={index}>
          - <Link href={`/${note}`}>{decodeURIComponent(note)}</Link>
        </li>
      ))}
    </ul>
  );
}

function getKeys() {
  let keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    let key = localStorage.key(i);
    if (key) keys.push(key);
  }
  return keys;
}
