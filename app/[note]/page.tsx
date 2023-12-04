"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FancyTextarea } from "./FancyTextarea";

export default function Page({ params }: { params: { note: string } }) {
  let [state, setState] = useState("");
  let debounceRef = useRef<null | number>(null);

  let [broadcastChannel, setBroadcastChannel] =
    useState<null | BroadcastChannel>(null);
  useEffect(() => {
    let channel = new BroadcastChannel(params.note);
    channel.onmessage = (e) => {
      setState(e.data);
    };
    setBroadcastChannel(channel);
    return () => {
      channel.close();
    };
  }, []);

  useEffect(() => {}, []);

  useEffect(() => {
    let value = localStorage.getItem(params.note);
    if (!value) {
      localStorage.setItem(params.note, "");
      let channel = new BroadcastChannel("notes-list");
      channel.postMessage(null);
      channel.close();
    }
    if (value) setState(value);
  }, [setState, params.note]);

  let setValue = useCallback(
    (value: string) => {
      setState(value);
      if (broadcastChannel) broadcastChannel.postMessage(value);
      if (debounceRef.current) window.clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        localStorage.setItem(params.note, value);
        debounceRef.current = null;
      }, 500);
    },
    [setState, params.note, broadcastChannel]
  );

  return (
    <div className="w-full p-2 h-[100vh]">
      <FancyTextarea
        autoFocus
        className="border-2 w-full p-2 h-full outline-none"
        value={state}
        style={{ resize: "none" }}
        setValue={setValue}
      />
    </div>
  );
}
