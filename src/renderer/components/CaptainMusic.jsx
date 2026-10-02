import { useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { read, captainFunction } from "../lib/captain";

function decode(value) {
  const element = document.createElement("textarea");
  element.innerHTML = String(value || "");
  return element.value;
}

export default function CaptainMusic({ data, run, ask, onNotice }) {
  const [selected, setSelected] = useState("");
  const artist = data.artists?.find((item) => item.id === selected);
  const songs = data.songs?.filter((item) => item.artist_id === selected) || [];
  async function add(table, name, extra = {}) {
    if (!name.trim()) return false;
    const rows =
      table === "music_artists"
        ? data.artists || []
        : table === "music_songs"
          ? songs
          : data.genres || [];
    if (
      rows.some(
        (item) =>
          item.name.toLowerCase() === name.trim().toLowerCase() ||
          (extra.youtube_channel_id &&
            item.youtube_channel_id === extra.youtube_channel_id) ||
          (extra.youtube_video_id &&
            item.youtube_video_id === extra.youtube_video_id),
      )
    ) {
      onNotice("This item is already saved.");
      return false;
    }
    return run(() =>
      read(
        supabase
          .from(table)
          .insert({
            name: name.trim(),
            display_order:
              Math.max(-1, ...rows.map((item) => item.display_order || 0)) + 1,
            ...(table === "music_artists"
              ? { is_favorite: false }
              : table === "music_songs"
                ? { artist_id: selected }
                : {}),
            ...extra,
          }),
      ),
    );
  }
  async function remove(table, item) {
    if (
      !(await ask(
        `Delete ${item.name}?${table === "music_artists" ? " All of this artist's songs will also be removed." : ""}`,
        false,
      ))
    )
      return;
    const success = await run(() =>
      read(supabase.from(table).delete().eq("id", item.id)),
    );
    if (success && selected === item.id) setSelected("");
  }
  async function move(table, item, list, offset) {
    const neighbor = list[list.findIndex((row) => row.id === item.id) + offset];
    if (!neighbor) return;
    await run(async () => {
      await read(
        supabase
          .from(table)
          .update({ display_order: neighbor.display_order })
          .eq("id", item.id)
          .select("id")
          .single(),
      );
      await read(
        supabase
          .from(table)
          .update({ display_order: item.display_order })
          .eq("id", neighbor.id)
          .select("id")
          .single(),
      );
    });
  }
  function list(table, rows) {
    return (
      <div className="music-manager-list">
        {!rows.length && (
          <div className="music-empty">
            {table === "music_songs" && !artist
              ? "Select an artist to manage songs."
              : "No items saved yet."}
          </div>
        )}
        {rows.map((item, index) => (
          <div
            className={`music-manager-item${item.id === selected ? " selected" : ""}`}
            key={item.id}
          >
            <div className="music-item-info">
              <div className="music-item-name">
                {item.name}
                {item.is_favorite ? " ⭐" : ""}
              </div>
              <div className="music-item-meta">
                #{index + 1}
                {item.youtube_channel_id || item.youtube_video_id
                  ? " · YouTube connected"
                  : " · Added manually"}
              </div>
            </div>
            <div className="music-item-actions">
              {table === "music_artists" && (
                <>
                  <button
                    className="music-small-button"
                    onClick={() => setSelected(item.id)}
                  >
                    {selected === item.id ? "Selected" : "Select"}
                  </button>
                  <button
                    className={`music-small-button${item.is_favorite ? " favorite" : ""}`}
                    aria-label={`Toggle favorite for ${item.name}`}
                    onClick={() =>
                      run(() =>
                        read(
                          supabase
                            .from(table)
                            .update({ is_favorite: !item.is_favorite })
                            .eq("id", item.id)
                            .select("id")
                            .single(),
                        ),
                      )
                    }
                  >
                    ⭐
                  </button>
                </>
              )}
              <button
                className="music-small-button"
                disabled={!index}
                aria-label={`Move ${item.name} up`}
                onClick={() => move(table, item, rows, -1)}
              >
                ↑
              </button>
              <button
                className="music-small-button"
                disabled={index === rows.length - 1}
                aria-label={`Move ${item.name} down`}
                onClick={() => move(table, item, rows, 1)}
              >
                ↓
              </button>
              <button
                className="music-small-button danger"
                aria-label={`Delete ${item.name}`}
                onClick={() => remove(table, item)}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    );
  }
  return (
    <section className="music-management">
      <div className="music-management-grid">
        <div className="music-manager-card">
          <h3>🎤 Favorite Artists</h3>
          <p>Add artists manually or search YouTube.</p>
          <AddMusic
            placeholder="Artist name..."
            onAdd={(name) => add("music_artists", name)}
          />
          <MusicSearch
            type="channel"
            rows={data.artists || []}
            onNotice={onNotice}
            onAdd={(item) =>
              add("music_artists", decode(item.title), {
                youtube_channel_id: item.id,
                youtube_url: item.url,
              })
            }
          />
          {list("music_artists", data.artists || [])}
        </div>
        <div className="music-manager-card">
          <h3>🎶 Favorite Songs</h3>
          <p>Select an artist, then manage their favorite songs.</p>
          <div className="selected-artist-display">
            {artist ? `Selected artist: ${artist.name}` : "No artist selected."}
          </div>
          <AddMusic
            placeholder="Song name..."
            disabled={!artist}
            onAdd={(name) => add("music_songs", name)}
          />
          <MusicSearch
            key={selected}
            type="video"
            artist={artist}
            disabled={!artist}
            rows={songs}
            onNotice={onNotice}
            onAdd={(item) =>
              add("music_songs", decode(item.title), {
                youtube_video_id: item.id,
                youtube_url: item.url,
              })
            }
          />
          {list("music_songs", songs)}
        </div>
        <div className="music-manager-card full-width">
          <h3>🎼 Favorite Genres</h3>
          <p>Manage the genres shown on the Music page.</p>
          <AddMusic
            placeholder="Genre name..."
            onAdd={(name) => add("music_genres", name)}
          />
          {list("music_genres", data.genres || [])}
        </div>
      </div>
    </section>
  );
}

function AddMusic({ placeholder, disabled, onAdd }) {
  const [value, setValue] = useState("");
  return (
    <form
      className="music-input-row"
      onSubmit={async (event) => {
        event.preventDefault();
        if (await onAdd(value)) setValue("");
      }}
    >
      <input
        className="music-input"
        aria-label={placeholder.replace("...", "")}
        placeholder={placeholder}
        disabled={disabled}
        required
        value={value}
        onChange={(event) => setValue(event.target.value)}
      />
      <button
        className="music-small-button"
        disabled={disabled || !value.trim()}
      >
        + Add
      </button>
    </form>
  );
}

function MusicSearch({ type, artist, disabled, rows, onAdd, onNotice }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const request = useRef(0);
  useEffect(
    () => () => {
      request.current++;
    },
    [],
  );
  function cancel() {
    request.current++;
    setSearching(false);
    setResults(null);
    setQuery("");
    setError("");
  }
  async function search(event) {
    event.preventDefault();
    if (searching || !query.trim()) return;
    if (type === "video" && !artist?.youtube_channel_id) {
      setError(
        "This artist was added manually and does not have a YouTube channel connected. Re-add the artist using YouTube Search.",
      );
      return;
    }
    const token = ++request.current;
    setSearching(true);
    setError("");
    try {
      const data = await captainFunction("music-search", {
        query: query.trim(),
        type,
        ...(type === "video" ? { channelId: artist.youtube_channel_id } : {}),
      });
      if (request.current === token) setResults(data.results || []);
    } catch (error) {
      if (request.current === token) {
        setError(error.message);
        onNotice("Music search failed. Try again.");
      }
    } finally {
      if (request.current === token) setSearching(false);
    }
  }
  return (
    <>
      <form className="music-input-row captain-music-search" onSubmit={search}>
        <input
          className="music-input"
          aria-label={
            type === "channel"
              ? "Search YouTube artists"
              : "Search artist songs"
          }
          placeholder={
            type === "channel"
              ? "Search YouTube for an artist..."
              : "Search this artist's songs..."
          }
          value={query}
          disabled={disabled}
          onChange={(event) => setQuery(event.target.value)}
        />
        <button
          className="music-small-button"
          disabled={disabled || searching || !query.trim()}
        >
          {searching ? "Searching..." : "🔎 Search"}
        </button>
        {(searching || results !== null) && (
          <button
            type="button"
            className="music-small-button danger"
            onClick={cancel}
          >
            ✕ Cancel
          </button>
        )}
      </form>
      {error && (
        <p className="music-status" role="alert">
          {error}
        </p>
      )}
      <div className="music-manager-list" aria-live="polite">
        {searching && (
          <div className="music-empty">🔎 Searching YouTube...</div>
        )}
        {results?.length === 0 && (
          <div className="music-empty">No results found.</div>
        )}
        {results?.map((item) => {
          const added = rows.some(
            (row) =>
              row.youtube_channel_id === item.id ||
              row.youtube_video_id === item.id ||
              row.name.toLowerCase() === decode(item.title).toLowerCase(),
          );
          return (
            <div className="music-manager-item" key={item.id}>
              <div className="music-item-info captain-search-info">
                {item.thumbnail && (
                  <img
                    className="music-search-thumbnail"
                    src={item.thumbnail}
                    alt=""
                    loading="lazy"
                  />
                )}
                <div>
                  <div className="music-item-name">{decode(item.title)}</div>
                  <div className="music-item-meta">
                    {decode(item.channelTitle || "YouTube")}
                  </div>
                </div>
              </div>
              <button
                className="music-small-button favorite"
                disabled={added}
                onClick={() => onAdd(item)}
              >
                {added ? "✓ Already Added" : "+ Add"}
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}
