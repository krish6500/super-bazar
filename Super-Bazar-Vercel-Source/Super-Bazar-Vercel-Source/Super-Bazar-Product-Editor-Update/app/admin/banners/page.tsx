"use client";
import { FormEvent, useEffect, useState } from "react";
import { authFetch } from "../../lib/auth-fetch";
type Banner = {
  id: number;
  title: string;
  desktopUrl: string;
  mobileUrl: string;
};
export default function BannerManager() {
  const [banners, setBanners] = useState<Banner[]>([]),
    [note, setNote] = useState(""),
    [busy, setBusy] = useState(false);
  const load = () =>
    authFetch("/api/banners")
      .then((r) => r.json())
      .then((d) => setBanners(d.banners || []));
  useEffect(() => {
    void load();
  }, []);
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const r = await authFetch("/api/banners", { method: "POST", body: form });
    const d = await r.json();
    setBusy(false);
    if (!r.ok) {
      setNote(d.error);
      return;
    }
    e.currentTarget.reset();
    setNote("Festival banner published");
    void load();
  };
  const remove = async (id: number) => {
    await authFetch(`/api/banners?id=${id}`, { method: "DELETE" });
    setNote("Banner removed");
    void load();
  };
  return (
    <main className="manager-page">
      <header>
        <a className="brand" href="/">
          <span>super</span>bazar<i>.</i>
        </a>
        <nav>
          <a href="/admin">Dashboard</a>
          <a href="/admin/products">Products</a>
        </nav>
      </header>
      <section>
        <p className="eyebrow">PROMOTIONS</p>
        <h1>Festival banners</h1>
        <p className="manager-intro">
          Upload separate artwork for laptop and mobile so text and products
          never get cropped.
        </p>
        <div className="banner-grid">
          <form className="manager-form" onSubmit={submit}>
            <h2>Publish new banner</h2>
            <label>
              Campaign name
              <input
                required
                name="title"
                placeholder="Example: Diwali Dhamaka"
              />
            </label>
            <label>
              Desktop banner{" "}
              <small>Recommended 1600 × 450 px, JPG/PNG/WebP</small>
              <input required name="desktop" type="file" accept="image/*" />
            </label>
            <label>
              Mobile banner{" "}
              <small>Recommended 900 × 1000 px, JPG/PNG/WebP</small>
              <input required name="mobile" type="file" accept="image/*" />
            </label>
            <button disabled={busy}>
              {busy ? "Uploading…" : "Publish banner →"}
            </button>
          </form>
          <div className="banner-list">
            <h2>Active banners</h2>
            {!banners.length ? (
              <div className="empty">
                <span>🎉</span>
                <h3>No festival banners</h3>
                <p>Upload desktop and mobile artwork to begin.</p>
              </div>
            ) : (
              banners.map((b) => (
                <article key={b.id}>
                  <picture>
                    <source media="(max-width:600px)" srcSet={b.mobileUrl} />
                    <img src={b.desktopUrl} alt={b.title} />
                  </picture>
                  <div>
                    <b>{b.title}</b>
                    <button onClick={() => remove(b.id)}>Remove</button>
                  </div>
                </article>
              ))
            )}
          </div>
        </div>
      </section>
      {note && <div className="toast">{note}</div>}
    </main>
  );
}
