/**
 * End-to-end smoke test for the TeamFlow API and realtime layer.
 * Runs against a live backend (REST + all four Socket.IO namespaces).
 *
 *   API_URL=http://localhost:4000 npm run test:smoke
 *
 * Every run uses fresh, unique accounts, so it can be re-run against the same database.
 */
import { io } from "socket.io-client";

const B = (process.env.API_URL || "http://localhost:4000").replace(/\/$/, "");
const RUN = Date.now().toString(36);
const mail = (name) => `${name}+${RUN}@smoke.test`;
let pass = 0, fail = 0;
const check = (name, cond, extra = "") => {
  if (cond) { pass++; console.log("  ✓", name); }
  else { fail++; console.log("  ✗", name, extra); }
};
const req = async (method, path, token, body, isForm) => {
  const r = await fetch(B + path, {
    method,
    headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && !isForm ? { "Content-Type": "application/json" } : {}) },
    body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
  });
  let data; try { data = await r.json(); } catch { data = null; }
  return { status: r.status, data };
};
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const once = (s, ev, ms = 3000) => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout " + ev)), ms); s.once(ev, (d) => { clearTimeout(t); res(d); }); });
const sock = (ns, token) => io(`${B}/${ns}`, { auth: { token }, transports: ["websocket"] });

console.log("Auth");
let r = await req("POST", "/auth/signup", null, { name: "Alice", email: mail("Alice"), password: "short" });
check("rejects short password", r.status === 400);
r = await req("POST", "/auth/signup", null, { name: "Alice", email: mail("Alice"), password: "password123" });
check("signup returns token", r.status === 201 && r.data.token, JSON.stringify(r.data));
check("signup hides password hash", r.data.user && !("password" in r.data.user));
const A = r.data.token, aliceId = r.data.user.id;
r = await req("POST", "/auth/signup", null, { name: "Bob", email: mail("bob"), password: "password123" });
const Bt = r.data.token, bobId = r.data.user.id;
r = await req("POST", "/auth/signup", null, { name: "Eve", email: mail("eve"), password: "password123" });
const E = r.data.token;
r = await req("POST", "/auth/signup", null, { email: mail("alice"), password: "password123" });
check("duplicate email (case-insensitive) → 409", r.status === 409);
r = await req("POST", "/auth/signin", null, { email: mail("ALICE"), password: "password123" });
check("signin is case-insensitive", r.status === 200 && r.data.token && !("password" in r.data.user));
r = await req("POST", "/auth/signin", null, { email: mail("nobody"), password: "x" });
check("unknown user → 401 generic message", r.status === 401 && r.data.error === "Invalid email or password");
r = await req("GET", "/auth/me", A);
check("/auth/me", r.status === 200 && r.data.email === mail("alice"));
r = await req("GET", "/board/all", "garbage");
check("bad token → 401", r.status === 401);

console.log("Boards");
r = await req("GET", "/board/all", A);
check("empty board list is 200 []", r.status === 200 && Array.isArray(r.data) && r.data.length === 0);
r = await req("POST", "/board/new", A, { title: "Sprint", userEmails: [mail("bob"), mail("ghost")] });
check("create board", r.status === 201 && r.data.users.length === 1);
check("reports unknown invitee emails", JSON.stringify(r.data.notFoundEmails) === JSON.stringify([mail("ghost")]));
const boardId = r.data.id;
r = await req("POST", "/board/new", Bt, { title: "Sprint" });
check("same title allowed for another user", r.status === 201);
r = await req("POST", "/board/new", A, { title: "   " });
check("blank title rejected", r.status === 400);
r = await req("GET", "/board/all", A);
check("list has counts + lastActivity + isOwner", r.data[0]._count && r.data[0].lastActivity && r.data[0].isOwner === true);
r = await req("GET", `/board/${boardId}`, Bt);
check("member can open board", r.status === 200 && r.data.isOwner === false);
r = await req("GET", `/board/${boardId}`, E);
check("non-member gets 404", r.status === 404);
r = await req("PATCH", `/board/${boardId}`, Bt, { title: "hijack" });
check("non-owner can't rename", r.status === 403);
r = await req("PATCH", `/board/${boardId}`, A, { title: "Sprint 12" });
check("owner renames", r.status === 200 && r.data.title === "Sprint 12");
r = await req("POST", `/board/${boardId}/members`, A, { email: mail("eve") });
check("owner invites eve", r.status === 201 && r.data.name === "Eve");
r = await req("POST", `/board/${boardId}/members`, Bt, { email: mail("x") });
check("non-owner can't invite", r.status === 403);
r = await req("GET", `/board/${boardId}/members`, E);
check("members list", r.status === 200 && r.data.users.length === 2);
r = await req("DELETE", `/board/${boardId}/members/${aliceId}`, Bt);
check("owner can't be removed", r.status === 400);

console.log("Sockets");
const evil = sock("chat", E + "x");
check("socket rejects bad token", await once(evil, "connect_error").then(() => true, () => false));
evil.close();

const aBoard = sock("board", A), bBoard = sock("board", Bt);
await Promise.all([once(aBoard, "connect"), once(bBoard, "connect")]);
aBoard.emit("joinBoard", boardId);
await once(aBoard, "presence");
const pres = once(aBoard, "presence");
bBoard.emit("joinBoard", boardId);
const p = await pres;
check("presence shows both users", p.users.length === 2, JSON.stringify(p));

const aChat = sock("chat", A), bChat = sock("chat", Bt);
await Promise.all([once(aChat, "connect"), once(bChat, "connect")]);
const [ia, ib] = [once(aChat, "initialMessages"), once(bChat, "initialMessages")];
aChat.emit("joinBoard", boardId); bChat.emit("joinBoard", boardId);
const init = await ia; await ib;
check("initialMessages paginated shape", Array.isArray(init.messages) && init.hasMore === false);
const got = once(bChat, "chatMessage");
const ack = await new Promise((res) => aChat.emit("chatMessage", { boardId, message: "  hello  " }, res));
check("chat ack ok", ack.ok && ack.message.message === "hello");
const m = await got;
check("chat broadcast with user (no password)", m.user.name === "Alice" && !("password" in m.user));
const empty = await new Promise((res) => aChat.emit("chatMessage", { boardId, message: "   " }, res));
check("empty message rejected", empty.ok === false);

// Outsider: join is refused, and sending without joining is refused.
const other = await req("POST", "/board/new", Bt, { title: "Private" });
const outsider = sock("chat", A);
await once(outsider, "connect");
const errEv = once(outsider, "error");
outsider.emit("joinBoard", other.data.id);
check("chat join of foreign board refused", (await errEv).message.includes("access denied"));
const bad = await new Promise((res) => outsider.emit("chatMessage", { boardId: other.data.id, message: "spy" }, res));
check("chat send to foreign board refused", bad.ok === false);
outsider.close();

r = await req("GET", `/chat/${boardId}?limit=1`, Bt);
check("REST chat history", r.status === 200 && r.data.messages.length === 1);
r = await req("GET", `/chat/${other.data.id}`, A);
check("REST chat of foreign board → 403", r.status === 403);

const aDraw = sock("draw", A), bDraw = sock("draw", Bt);
await Promise.all([once(aDraw, "connect"), once(bDraw, "connect")]);
const [da, db] = [once(aDraw, "initialDrawing"), once(bDraw, "initialDrawing")];
aDraw.emit("joinBoard", boardId); bDraw.emit("joinBoard", boardId);
await da; await db;
const strokeEv = once(bDraw, "newStroke");
aDraw.emit("newStroke", { boardId, stroke: { id: "s1", tool: "pen", color: "#ff0000", size: 4, points: [1.234, 2, 3, 4] } });
const st = await strokeEv;
check("stroke broadcast, userId set by server", st.userId === aliceId && st.points[0] === 1.2);
aDraw.emit("newStroke", { boardId, stroke: { id: "bad", points: [1, "x"] } });
const removed = once(aDraw, "strokeRemoved", 800).then(() => true, () => false);
bDraw.emit("removeStroke", { boardId, strokeId: "s1" });
check("bob can't undo alice's stroke", (await removed) === false);
const cur = once(bDraw, "cursorMove");
aDraw.emit("cursorMove", { boardId, position: { x: 10, y: 20 } });
check("cursor includes name", (await cur).name === "Alice");
await wait(1800); // debounce save
r = await req("GET", `/draw/${boardId}`, Bt);
check("drawing persisted (invalid stroke dropped)", r.data.strokes.length === 1 && r.data.strokes[0].id === "s1");

r = await req("GET", `/draw/${other.data.id}`, A);
check("drawing of foreign board → 403", r.status === 403);

console.log("Files");
const fd = new FormData();
fd.append("file", new Blob(["<script>alert(1)</script>"], { type: "text/html" }), "evil.html");
const fileEv = once(bBoard, "fileAdded");
r = await req("POST", `/files/${boardId}`, Bt, fd, true);
check("upload", r.status === 201 && r.data.user.name === "Bob");
check("realtime fileAdded event", (await fileEv).id === r.data.id);
const fileId = r.data.id, url = r.data.url;
const dl = await fetch(B + url);
check("html served as attachment + nosniff", dl.headers.get("content-disposition") === "attachment" && dl.headers.get("x-content-type-options") === "nosniff");
const fd2 = new FormData(); fd2.append("file", new Blob(["x"]), "x.txt");
r = await req("POST", `/files/${other.data.id}`, A, fd2, true);
check("upload to foreign board → 403", r.status === 403);
r = await req("DELETE", `/files/${other.data.id}/${fileId}`, Bt);
check("can't delete file via another board's id", r.status === 404);
r = await req("DELETE", `/files/${boardId}/${fileId}`, E);
check("non-uploader non-owner can't delete", r.status === 403);
r = await req("DELETE", `/files/${boardId}/${fileId}`, A);
check("owner deletes file", r.status === 200);

console.log("RTC");
const aR = sock("rtc", A), bR = sock("rtc", Bt);
await Promise.all([once(aR, "connect"), once(bR, "connect")]);
const callEv = once(bBoard, "callStatus");
const peersA = once(aR, "rtc-peers");
aR.emit("joinRTC", { boardId, audio: true, video: false });
check("first joiner gets empty peers", (await peersA).peers.length === 0);
check("board sees call status", (await callEv).participants[0].video === false);
const joinedEv = once(aR, "rtc-peer-joined");
const peersB = once(bR, "rtc-peers");
bR.emit("joinRTC", boardId);
const peers = await peersB;
check("second joiner gets alice as peer", peers.peers.length === 1 && peers.peers[0].name === "Alice");
check("alice notified of bob", (await joinedEv).name === "Bob");
const offerEv = once(aR, "offer");
bR.emit("offer", { boardId, to: peers.peers[0].socketId, offer: { type: "offer", sdp: "x" } });
check("offer relayed with peer info", (await offerEv).peer.name === "Bob");
const leftEv = once(aR, "rtc-peer-left");
bR.close();
check("peer-left on disconnect", !!(await leftEv).socketId);
aR.emit("leaveRTC", boardId);
await wait(300);
r = await req("GET", `/rtc/${boardId}`, A);
check("call session recorded and ended", r.data.length === 1 && r.data[0].endedAt);

console.log("Delete");
r = await req("DELETE", `/board/${boardId}/members/${bobId}`, Bt);
check("bob leaves board", r.status === 200);
const delEv = once(aBoard, "boardDeleted");
r = await req("DELETE", `/board/${boardId}`, A);
check("delete board with chat/drawing/files cascades", r.status === 200);
check("boardDeleted event", (await delEv).id === boardId);
r = await req("GET", "/nope", A);
check("unknown route → JSON 404", r.status === 404 && r.data.error);

[aBoard, bBoard, aChat, bChat, aDraw, bDraw, aR].forEach((s) => s.close());
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
