// pages/index.tsx
import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";

export default function Home() {
    const { data: session } = useSession();
    const [spotifyPlaylists, setSpotifyPlaylists] = useState<any[]>([]);
    const [googlePlaylists, setGooglePlaylists] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");

    const hasSpotify = !!session?.providers?.spotify?.accessToken;
    const hasGoogle = !!session?.providers?.google?.accessToken;

    useEffect(() => {
        async function loadSpotify() {
            if (!hasSpotify) return;
            const res = await fetch("/api/spotify/playlists");
            const data = await res.json();
            if (res.ok && data.playlists) setSpotifyPlaylists(data.playlists);
        }
        async function loadGoogle() {
            if (!hasGoogle) return;
            const res = await fetch("/api/google/playlists");
            const data = await res.json();
            if (res.ok && data.playlists) setGooglePlaylists(data.playlists);
        }
        loadSpotify();
        loadGoogle();
    }, [hasSpotify, hasGoogle]);

    async function transfer(p: any) {
        if (!hasGoogle) {
            alert("Connect Google (YouTube) first");
            return;
        }
        setLoading(true);
        setMessage("Transferring… this may take a minute for big playlists.");
        const res = await fetch("/api/transfer", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ playlistId: p.id, playlistName: p.name }),
        });
        const data = await res.json();
        if (res.ok) {
            setMessage(`✅ Done! Added ${data.success}/${data.total}. YouTube Playlist ID: ${data.createdPlaylistId}. Failed: ${data.failed.length}`);
            console.log("Failed tracks:", data.failed);
        } else {
            setMessage(`❌ Error: ${data.error || "Transfer failed"}`);
        }
        setLoading(false);
    }

    return (
        <main className="min-h-screen bg-gray-50">
            <div className="max-w-4xl mx-auto p-6">
                <h1 className="text-3xl font-bold mb-4">Playlist Transfer (Spotify → YouTube)</h1>

                <div className="flex items-center gap-3 mb-6">
                    {!session ? (
                        <button onClick={() => signIn()} className="px-4 py-2 rounded bg-black text-white">Sign In</button>
                    ) : (
                        <>
                            <span className="text-gray-700">Hi, {session.user?.name || "User"}</span>
                            <button onClick={() => signOut()} className="px-3 py-2 rounded border">Sign Out</button>
                        </>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    <div className="p-4 rounded-2xl bg-white border">
                        <h2 className="font-semibold mb-2">Spotify</h2>
                        {hasSpotify ? <p className="text-green-600">Connected ✅</p> : <button onClick={() => signIn("spotify")} className="mt-2 px-4 py-2 rounded bg-green-600 text-white">Connect Spotify</button>}
                    </div>

                    <div className="p-4 rounded-2xl bg-white border">
                        <h2 className="font-semibold mb-2">Google (YouTube)</h2>
                        {hasGoogle ? <p className="text-green-600">Connected ✅</p> : <button onClick={() => signIn("google")} className="mt-2 px-4 py-2 rounded bg-red-600 text-white">Connect Google</button>}
                    </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                    <section className="bg-white p-4 border rounded-2xl">
                        <h3 className="font-semibold mb-3">Your Spotify Playlists</h3>
                        {spotifyPlaylists.length ? spotifyPlaylists.map(p => (
                            <div key={p.id} className="p-3 flex items-center justify-between border rounded mb-2">
                                <div>
                                    <div className="font-medium">{p.name}</div>
                                    <div className="text-sm text-gray-500">{p.tracks.total} Tracks</div>
                                </div>
                                <button disabled={loading} onClick={() => transfer(p)} className="px-3 py-2 rounded bg-blue-600 text-white disabled:opacity-50">Transfer → YouTube</button>
                            </div>
                        )) : <p className="text-gray-500">No Spotify playlists loaded.</p>}
                    </section>

                    <section className="bg-white p-4 border rounded-2xl">
                        <h3 className="font-semibold mb-3">Your YouTube Playlists</h3>
                        {googlePlaylists.length ? googlePlaylists.map((g: any) => (
                            <div key={g.id} className="p-3 border rounded mb-2 flex items-center justify-between">
                                <div>
                                    <div className="font-medium">{g.snippet?.title}</div>
                                    <div className="text-sm text-gray-500">{g.contentDetails?.itemCount ?? 0} Tracks</div>
                                </div>
                                {/* show transfer button only if both Google and Spotify connected */}
                                {hasGoogle && hasSpotify ? (
                                    <button
                                        disabled={loading}
                                        onClick={async () => {
                                            setLoading(true);
                                            setMessage("Transferring playlist… this may take a while.");
                                            const res = await fetch("/api/transfer-from-youtube", {
                                                method: "POST",
                                                headers: { "Content-Type": "application/json" },
                                                body: JSON.stringify({ playlistId: g.id, playlistName: g.snippet?.title }),
                                            });
                                            const data = await res.json();
                                            if (res.ok) setMessage(`✅ Done: added ${data.added}/${data.totalVideos}. Spotify playlist ID: ${data.createdPlaylistId}`);
                                            else setMessage(`❌ ${data.error || "Transfer failed"}`);
                                            setLoading(false);
                                        }}
                                        className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50"
                                    >
                                        Transfer → Spotify
                                    </button>
                                ) : (
                                    <div className="text-sm text-gray-400">Connect both to transfer</div>
                                )}
                            </div>
                        )) : <p className="text-gray-500">No YouTube Music playlists loaded.</p>}
                    </section>
                </div>

                {message && <div className="mt-6 p-3 bg-white border rounded-2xl">{loading ? <span className="animate-pulse">{message}</span> : message}</div>}
            </div>
        </main>
    );
}